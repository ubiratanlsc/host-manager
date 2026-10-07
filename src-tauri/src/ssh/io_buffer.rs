/// Buffer de escrita para um canal libssh2 não-bloqueante.
///
/// O libssh2 exige que, depois de um `EAGAIN`, a próxima escrita repita
/// exatamente o mesmo buffer. Por isso separamos o bloco "em voo" (fixo até
/// ser entregue por completo) da fila onde chegam os bytes novos.
pub struct WriteBuffer {
    queue: Vec<u8>,
    in_flight: Vec<u8>,
    offset: usize,
    max_chunk: usize,
}

impl WriteBuffer {
    pub fn new(max_chunk: usize) -> Self {
        Self {
            queue: Vec::new(),
            in_flight: Vec::new(),
            offset: 0,
            max_chunk: max_chunk.max(1),
        }
    }

    pub fn push(&mut self, data: &[u8]) {
        self.queue.extend_from_slice(data);
    }

    /// Bytes a escrever agora. Só promove a fila para "em voo" quando o bloco
    /// anterior terminou, para que um retry após `EAGAIN` veja o mesmo slice.
    pub fn next_chunk(&mut self) -> Option<&[u8]> {
        if self.offset >= self.in_flight.len() && !self.queue.is_empty() {
            let take = self.queue.len().min(self.max_chunk);
            self.in_flight = self.queue.drain(..take).collect();
            self.offset = 0;
        }
        if self.offset < self.in_flight.len() {
            Some(&self.in_flight[self.offset..])
        } else {
            None
        }
    }

    pub fn advance(&mut self, written: usize) {
        self.offset = (self.offset + written).min(self.in_flight.len());
    }

    /// `true` enquanto há um bloco parcialmente entregue.
    pub fn is_mid_write(&self) -> bool {
        self.offset < self.in_flight.len()
    }

    #[cfg(test)]
    pub fn is_empty(&self) -> bool {
        !self.is_mid_write() && self.queue.is_empty()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn retry_after_would_block_sees_the_same_bytes_even_if_more_arrive() {
        let mut buffer = WriteBuffer::new(8192);
        buffer.push(b"ls -la");
        let first = buffer.next_chunk().unwrap().to_vec();
        // Simula EAGAIN: nada escrito, chegam mais bytes do usuário.
        buffer.push(b"\x7f\x7f");
        assert_eq!(buffer.next_chunk().unwrap(), first.as_slice());
    }

    #[test]
    fn partial_writes_continue_from_the_offset_then_drain_the_queue() {
        let mut buffer = WriteBuffer::new(8192);
        buffer.push(b"abcdef");
        buffer.next_chunk();
        buffer.push(b"gh");
        buffer.advance(4);
        assert!(buffer.is_mid_write());
        assert_eq!(buffer.next_chunk().unwrap(), b"ef");
        buffer.advance(2);
        assert_eq!(buffer.next_chunk().unwrap(), b"gh");
        buffer.advance(2);
        assert!(buffer.is_empty());
        assert!(buffer.next_chunk().is_none());
    }

    #[test]
    fn coalesces_queued_bytes_up_to_the_chunk_limit() {
        let mut buffer = WriteBuffer::new(4);
        buffer.push(b"ab");
        buffer.push(b"cdef");
        assert_eq!(buffer.next_chunk().unwrap(), b"abcd");
        buffer.advance(4);
        assert_eq!(buffer.next_chunk().unwrap(), b"ef");
    }
}
