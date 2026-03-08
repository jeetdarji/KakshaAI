'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

const TextType = ({
    scripts = [],
    typingSpeed = 50,
    deletingSpeed = 30,
    pauseDuration = 2000,
    cursorClassName = "bg-gray-300",
}) => {
    const [sentenceIdx, setSentenceIdx] = useState(0);
    const [segmentIdx, setSegmentIdx] = useState(0);
    const [charIdx, setCharIdx] = useState(0);
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        if (!scripts || scripts.length === 0) return;

        const currentSentence = scripts[sentenceIdx];
        const currentSegment = currentSentence[segmentIdx];

        let timeout;

        if (isDeleting) {
            // --- DELETING PHASE ---
            if (charIdx > 0) {
                // Delete one character
                timeout = setTimeout(() => {
                    setCharIdx((prev) => prev - 1);
                }, deletingSpeed);
            } else {
                // Segment is empty, move to previous segment
                if (segmentIdx > 0) {
                    const prevSegmentIdx = segmentIdx - 1;
                    const prevSegmentLength = currentSentence[prevSegmentIdx].text.length;

                    setSegmentIdx(prevSegmentIdx);
                    setCharIdx(prevSegmentLength); // Start at the end of prev segment
                } else {
                    // Full sentence deleted, move to next sentence
                    setIsDeleting(false);
                    setSentenceIdx((prev) => (prev + 1) % scripts.length);
                    setSegmentIdx(0);
                    setCharIdx(0);
                }
            }
        } else {
            // --- TYPING PHASE ---
            if (charIdx < currentSegment.text.length) {
                // Type one character
                timeout = setTimeout(() => {
                    setCharIdx((prev) => prev + 1);
                }, typingSpeed);
            } else {
                // Segment finished, move to next segment
                if (segmentIdx < currentSentence.length - 1) {
                    setSegmentIdx((prev) => prev + 1);
                    setCharIdx(0); // Start at beginning of next segment
                } else {
                    // Full sentence finished, wait then delete
                    timeout = setTimeout(() => {
                        setIsDeleting(true);
                    }, pauseDuration);
                }
            }
        }

        return () => clearTimeout(timeout);
    }, [
        charIdx,
        isDeleting,
        segmentIdx,
        sentenceIdx,
        scripts,
        typingSpeed,
        deletingSpeed,
        pauseDuration
    ]);

    // --- RENDER ---
    const currentSentence = scripts[sentenceIdx] || [];

    return (
        <span className="inline-block">
            {currentSentence.map((seg, i) => {
                let textToShow = "";

                // Logic:
                // 1. Past segments: Show full text
                // 2. Current segment: Show substring based on charIdx
                // 3. Future segments: Show nothing

                if (i < segmentIdx) {
                    textToShow = seg.text;
                } else if (i === segmentIdx) {
                    textToShow = seg.text.substring(0, charIdx);
                }

                return (
                    <span key={i} className={seg.className}>
                        {textToShow}
                    </span>
                );
            })}

            {/* Blinking Cursor */}
            <motion.span
                animate={{ opacity: [1, 0] }}
                transition={{ duration: 0.5, repeat: Infinity, repeatType: "reverse" }}
                className={`inline-block w-[2px] h-[1em] align-middle ml-0.5 ${cursorClassName}`}
            />
        </span>
    );
};

export default TextType;
