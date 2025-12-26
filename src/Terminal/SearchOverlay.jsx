import React, { useState, useEffect, useRef } from 'react';
import { Search, ArrowUp, ArrowDown, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { SearchIcon } from '@/components/animate-ui/icons/search';

const SearchOverlay = ({ searchAddon }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const inputRef = useRef(null);

    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isOpen]);

    const handleSearch = (term) => {
        setSearchTerm(term);
        if (term) {
            searchAddon.findNext(term);
        }
    };

    const handleNext = () => {
        if (searchAddon && searchTerm) {
            searchAddon.findNext(searchTerm);
        }
    };

    const handlePrev = () => {
        if (searchAddon && searchTerm) {
            searchAddon.findPrevious(searchTerm);
        }
    };

    const handleClose = () => {
        setIsOpen(false);
        setSearchTerm('');
    };

    return (
        <motion.div
            className="absolute top-2 right-2 z-50 bg-background/95 backdrop-blur-sm border border-border/50 rounded-lg shadow-lg overflow-hidden flex items-center"
            initial={false}
            animate={{
                width: isOpen ? 280 : 36,
                height: isOpen ? 36 : 36
            }}
            transition={{
                type: "spring",
                stiffness: 500,
                damping: 30
            }}
        >
            {/* Container interno flexível */}
            <div className="h-full flex items-center w-full px-1">
                {/* Ícone sempre visível */}


                {/* Input que cresce */}
                <motion.input
                    ref={inputRef}
                    type="text"
                    value={searchTerm}
                    onChange={(e) => handleSearch(e.target.value)}
                    placeholder={isOpen ? "Buscar..." : ""}
                    className="flex h-6 mr-1 bg-transparent border-none outline-none text-sm text-foreground placeholder:text-muted-foreground focus-visible:ring-0 focus-visible:ring-ring rounded focus-visible:ring-offset-0 px-1"
                    style={{
                        width: isOpen ? 'auto' : 0,
                        opacity: isOpen ? 1 : 0,
                        paddingLeft: isOpen ? 4 : 0,
                        paddingRight: isOpen ? 4 : 0
                    }}
                    transition={{ type: "spring", stiffness: 400, damping: 35 }}
                />

                {/* Controles */}
                <AnimatePresence>
                    {isOpen && (
                        <>
                            <div className="flex items-center gap-1 flex-shrink-0 ml-auto">
                                <motion.button
                                    onClick={handlePrev}
                                    className="w-5 h-6 p-0.5 hover:bg-accent hover:text-accent-foreground rounded text-muted-foreground flex items-center justify-center disabled:opacity-40"
                                    title="Anterior"
                                    disabled={!searchTerm}
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.8 }}
                                >
                                    <ArrowUp className="h-4 w-4" />
                                </motion.button>
                                <motion.button
                                    onClick={handleNext}
                                    className="w-5 h-6 p-0.5 hover:bg-accent hover:text-accent-foreground rounded text-muted-foreground flex items-center justify-center disabled:opacity-40"
                                    title="Próximo"
                                    disabled={!searchTerm}
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.8 }}
                                >
                                    <ArrowDown className="h-4 w-4" />
                                </motion.button>
                            </div>

                            <motion.button
                                onClick={handleClose}
                                className="w-5 h-6 p-0.5 hover:bg-destructive/10 hover:text-destructive rounded text-muted-foreground flex items-center justify-center flex-shrink-0 ml-1"
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.8 }}
                            >
                                <X className="h-4 w-4" />
                            </motion.button>
                        </>
                    )}
                </AnimatePresence>
                {!isOpen && (
                    <SearchIcon animateOnHover animation="path-loop" onClick={() => setIsOpen(!isOpen)} className="h-5 w-5 cursor-pointer" />

                )}
            </div>
        </motion.div>
    );
};

export default SearchOverlay;