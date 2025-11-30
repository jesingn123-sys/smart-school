import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';

interface QRCodeGeneratorProps {
  text: string;
  onQRCodeGenerated: (dataUrl: string) => void;
}

const QRCodeGenerator: React.FC<QRCodeGeneratorProps> = ({ text, onQRCodeGenerated }) => {
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);

  useEffect(() => {
    const generateQr = async () => {
      if (!text) {
        setQrCodeDataUrl(null);
        onQRCodeGenerated('');
        return;
      }
      try {
        const dataUrl = await QRCode.toDataURL(text, {
          errorCorrectionLevel: 'H',
          type: 'image/png',
          margin: 1,
          scale: 8,
          color: {
            dark: '#000000ff',
            light: '#ffffffff'
          }
        });
        setQrCodeDataUrl(dataUrl);
        onQRCodeGenerated(dataUrl);
      } catch (err) {
        console.error('Failed to generate QR code:', err);
        setQrCodeDataUrl(null);
        onQRCodeGenerated('');
      }
    };
    generateQr();
  }, [text, onQRCodeGenerated]);

  if (!qrCodeDataUrl) {
    return <p className="text-gray-600">Generating QR code...</p>;
  }

  return (
    <div className="flex justify-center items-center p-4 bg-gray-50 rounded-lg shadow-inner">
      <img src={qrCodeDataUrl} alt="Generated QR Code" className="w-48 h-48 border border-gray-300 rounded-md" />
    </div>
  );
};

export default QRCodeGenerator;