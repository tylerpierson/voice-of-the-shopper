import React, { useRef } from 'react';
import './ModalPopUp.scss';

const ModalPopUp = ({ isOpen, onClose, children }) => {
    const contentRef = useRef();

    if (!isOpen) return null;

    const handleOverlayClick = (e) => {
        // Close if clicked outside modal content
        if (contentRef.current && !contentRef.current.contains(e.target)) {
            onClose();
        }
    };

    return (
        <div className="modal-overlay" onClick={handleOverlayClick}>
            <div className="modal-content" ref={contentRef}>
                <button className="modal-close" onClick={onClose}></button>
                {children}
            </div>
        </div>
    );
};

export default ModalPopUp;
