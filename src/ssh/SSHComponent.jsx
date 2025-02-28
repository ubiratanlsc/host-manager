import { useContext, useEffect, useRef, useState } from 'react'
import { FitAddon } from 'xterm-addon-fit'
import { useSize } from 'ahooks'
import { Unicode11Addon } from 'xterm-addon-unicode11'
import { CanvasAddon } from '@xterm/addon-unicode11'
// import { WebglAddon } from '@xterm/addon-webgl'
// import { LigaturesAddon } from 'xterm-addon-ligatures'
import { LigaturesAddon } from '@xterm/addon-ligatures'
// import { ImageAddon } from 'xterm-addon-image'
// import { WebLinksAddon } from '@xterm/addon-web-links'
import { WebglAddon } from 'xterm-addon-webgl'  // caminho correto
import { WebLinksAddon } from 'xterm-addon-web-links'  // caminho correto
// import { CanvasAddon } from 'xterm-addon-canvas'  // caminho correto
import TerminalContext from '../context/TerminalContext'
import { SearchAddon } from 'xterm-addon-search'
import 'xterm/css/xterm.css' // Adicione esta importação
// import './ssh.css' // Adicione esta importação
const SSHComponent = ({ terminal, focused }) => {


    const target = useRef(null)
    const targetSize = useSize(target)
    const { open } = useContext(TerminalContext);
    const resize = new FitAddon()
    // const render = new WebglAddon() // TODO: user.config.renderMode === 'CANVAS' ? new CanvasAddon() : new WebglAddon(),
    //const render = new CanvasAddon(), // TODO: user.config.renderMode === 'CANVAS' ? new CanvasAddon() : new WebglAddon(),
    const webLinks = new WebLinksAddon()
    const unicode11 = new Unicode11Addon()
    const ligaturesAddon = new LigaturesAddon()
    const search = new SearchAddon({
        highlightLimit: 500
    })
    function debounce(func, wait) {
        let timeout;

        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };

            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
    const debouncedFit = debounce(() => {
        // resize.fit();
        let proposedDimensions = resize.proposeDimensions();
        terminal.xterm.resize(proposedDimensions.cols + 1, proposedDimensions.rows + 1);
    }, 100);

    useEffect(() => {
        terminal.xterm.focus()
        return () => terminal.xterm.blur()
    }, [focused])

    useEffect(() => {
        if (!target.current) {
            return
        }

        terminal.xterm.loadAddon(resize)
        // terminal.xterm.loadAddon(render)
        terminal.xterm.loadAddon(webLinks)
        // terminal.xterm.loadAddon(unicode11)
        // Open terminal in target element
        // const fitAddons = new FitAddon();
        // open.forEach(element => {
        // if (terminal.id == element.id) {
        terminal.xterm.open(target.current)
        //     }
        // });
        terminal.xterm.focus()
        // terminal.xterm.loadAddon(ligaturesAddon)
        terminal.xterm.loadAddon(search)
        // ligaturesAddon.activate(terminal.xterm)

        window.addEventListener('resize', debouncedFit);
        // Extra configurations for xtermjs addons
        // terminal.xterm.unicode.activeVersion = '11'

        if (terminal.xterm.unicode) {
            // terminal.xterm.unicode.activeVersion = '11'
        }


        const searchWithDecorations = (term) => {
            const options = {
                regex: false,
                wholeWord: true,
                caseSensitive: false,
                incremental: true,
                decorations: {
                    matchBackground: '#555555',
                    matchBorder: '#ffffff',
                    matchOverviewRuler: '#ffffff',
                    activeMatchBackground: '#ff0000',
                    activeMatchBorder: '#ffffff',
                    activeMatchColorOverviewRuler: '#ff0000'
                }
            };

            search.findNext(term, options);
        };

        search.onDidChangeResults(({ resultIndex, resultCount }) => {
            if (resultIndex === -1) {
                console.log('Limite de matches excedido');
            } else {
                console.log(`Resultado ${resultIndex + 1} de ${resultCount}`);
            }
        });

        searchWithDecorations('');

        return () => {
            resize.dispose();
            // terminal.xterm.fitAddon
            // render.dispose();
            webLinks.dispose();
            // unicode11.dispose();
            ligaturesAddon.dispose();
            search.dispose();
            // terminal.xterm.ligaturesAddon.dispose()
        }
    }, [])

    //overflow-y-hidden overflow-x-hidden w-full h-[100vh]
    return <div ref={target} className="overflow-y-hidden overflow-x-hidden w-full h-[100vh]" />
}

export default SSHComponent
