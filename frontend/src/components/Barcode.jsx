import React, { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';

const Barcode = ({ value, format = 'CODE128', width = 1.8, height = 50, displayValue = true }) => {
    const svgRef = useRef(null);

    useEffect(() => {
        if (svgRef.current && value) {
            try {
                JsBarcode(svgRef.current, value, {
                    format,
                    width,
                    height,
                    displayValue,
                    margin: 8,
                    background: '#ffffff',
                    lineColor: '#000000',
                });
            } catch (err) {
                console.error('Barcode rendering error:', err);
            }
        }
    }, [value, format, width, height, displayValue]);

    return <svg ref={svgRef} className="mx-auto block" />;
};

export default Barcode;
