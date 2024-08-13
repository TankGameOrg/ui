/* global console */
import "./game-manual.css";
import { useEffect, useState } from "preact/hooks";
import QRCode from "qrcode";

// Send user to the github since this instance might not be accessible from their phones
const MANUAL_URL_BASE = "https://github.com/TankGameOrg/ui/blob/main/";


export function GameManual({ manualPath }) {
    const [isManualOpen, setManualOpen] = useState(false);
    const [qrImage, setQrImage] = useState();

    useEffect(() => {
        if(!manualPath) return;

        const manualUrl = `${MANUAL_URL_BASE}${manualPath}`
            .replace(".html", ".md");

        QRCode.toDataURL(manualUrl, function(err, url) {
            if(err) {
                console.log("Failed to generate QR code", err);
            }

            setQrImage(!err ? url : undefined);
        });
    }, [manualPath, setQrImage]);

    if(!manualPath) return;

    const qrImageElement = qrImage !== undefined ? (
        <div>
            <img src={qrImage}/>
        </div>
    ) : undefined;

    return (
        <>
            <h3>Click or scan to read the rules</h3>
            <div>
                <button onClick={() => setManualOpen(true)}>Open Rules</button>
            </div>
            {qrImageElement}
            {isManualOpen ? <div className="manual-popup">
                <div className="manual-popup-title">
                    <h3>Rules</h3>
                    <button onClick={() => setManualOpen(false)}>Close</button>
                </div>
                <iframe className="manual-popup-body" src={manualPath}></iframe>
            </div> : undefined}
        </>
    )
}