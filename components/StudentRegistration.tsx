import React, { useState, useCallback, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Student, OCRResult } from '../types';
import { performOcr, blobToBase64 } from '../services/geminiService';
import { saveStudent } from '../services/studentService';
import QRCodeGenerator from './QRCodeGenerator';
import { FALLBACK_OCR_VALUE, DEFAULT_SCHOOL_NAME, DEFAULT_CLASS, DEFAULT_SECTION, DEFAULT_GENDER } from '../constants';

const StudentRegistration: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [ocrResult, setOcrResult] = useState<OCRResult | null>(null);
  const [studentId, setStudentId] = useState<string>('');
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // Store editable fields derived from OCR, with fallbacks
  const [editableStudentDetails, setEditableStudentDetails] = useState<Omit<Student, 'id' | 'icard_image_url' | 'qr_image_url' | 'created_at'>>({
    name: FALLBACK_OCR_VALUE,
    father_name: FALLBACK_OCR_VALUE,
    school_name: DEFAULT_SCHOOL_NAME,
    class: DEFAULT_CLASS,
    section: DEFAULT_SECTION,
    roll_number: FALLBACK_OCR_VALUE,
    gender: DEFAULT_GENDER,
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    setMessage(null);
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewImageUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setSelectedFile(null);
      setPreviewImageUrl(null);
      setOcrResult(null);
      setStudentId('');
      setQrCodeDataUrl(null);
      setEditableStudentDetails({
        name: FALLBACK_OCR_VALUE,
        father_name: FALLBACK_OCR_VALUE,
        school_name: DEFAULT_SCHOOL_NAME,
        class: DEFAULT_CLASS,
        section: DEFAULT_SECTION,
        roll_number: FALLBACK_OCR_VALUE,
        gender: DEFAULT_GENDER,
      });
    }
  }, []);

  const handleExtractDetails = useCallback(async () => {
    if (!selectedFile) {
      setError('Please upload an I-Card photo first.');
      return;
    }

    setLoading(true);
    setError(null);
    setMessage(null);
    setOcrResult(null);
    setQrCodeDataUrl(null);
    const newStudentId = uuidv4(); // Generate unique ID upfront for QR and student data
    setStudentId(newStudentId);

    try {
      const base64Image = await blobToBase64(selectedFile);
      const result = await performOcr(base64Image, selectedFile.type);
      setOcrResult(result);

      // Populate editable fields with OCR results or fallbacks
      setEditableStudentDetails({
        name: result.name || FALLBACK_OCR_VALUE,
        father_name: result.father_name || FALLBACK_OCR_VALUE,
        school_name: result.school_name || DEFAULT_SCHOOL_NAME,
        class: result.class || DEFAULT_CLASS,
        section: result.section || DEFAULT_SECTION,
        roll_number: result.roll_number || FALLBACK_OCR_VALUE,
        gender: result.gender || DEFAULT_GENDER,
      });

      setMessage('OCR extraction successful. Please review details.');
    } catch (err) {
      console.error('OCR or Image conversion failed:', err);
      setError('Failed to extract details from I-Card. Please try again or fill manually.');
      // Keep fallbacks
      setEditableStudentDetails({
        name: FALLBACK_OCR_VALUE,
        father_name: FALLBACK_OCR_VALUE,
        school_name: DEFAULT_SCHOOL_NAME,
        class: DEFAULT_CLASS,
        section: DEFAULT_SECTION,
        roll_number: FALLBACK_OCR_VALUE,
        gender: DEFAULT_GENDER,
      });
    } finally {
      setLoading(false);
    }
  }, [selectedFile]);

  const handleQRCodeGenerated = useCallback((dataUrl: string) => {
    setQrCodeDataUrl(dataUrl);
  }, []);

  const handleSaveStudent = useCallback(() => {
    if (!studentId || !previewImageUrl || !qrCodeDataUrl) {
      setError('Please ensure all details are extracted and QR generated before saving.');
      return;
    }

    // Check if essential fields are still default fallbacks
    if (editableStudentDetails.name === FALLBACK_OCR_VALUE ||
        editableStudentDetails.roll_number === FALLBACK_OCR_VALUE) {
      setError('Student Name and Roll Number are essential and cannot be "N/A". Please correct.');
      return;
    }

    const newStudent: Student = {
      id: studentId,
      name: editableStudentDetails.name,
      father_name: editableStudentDetails.father_name,
      school_name: editableStudentDetails.school_name,
      class: editableStudentDetails.class,
      section: editableStudentDetails.section,
      roll_number: editableStudentDetails.roll_number,
      gender: editableStudentDetails.gender,
      icard_image_url: previewImageUrl,
      qr_image_url: qrCodeDataUrl,
      created_at: new Date().toISOString(),
    };

    try {
      saveStudent(newStudent);
      setMessage(`Student "${newStudent.name}" (ID: ${newStudent.id}) registered successfully!`);
      // Reset form
      setSelectedFile(null);
      setPreviewImageUrl(null);
      setOcrResult(null);
      setStudentId('');
      setQrCodeDataUrl(null);
      setEditableStudentDetails({
        name: FALLBACK_OCR_VALUE,
        father_name: FALLBACK_OCR_VALUE,
        school_name: DEFAULT_SCHOOL_NAME,
        class: DEFAULT_CLASS,
        section: DEFAULT_SECTION,
        roll_number: FALLBACK_OCR_VALUE,
        gender: DEFAULT_GENDER,
      });
      if (fileInputRef.current) {
        fileInputRef.current.value = ''; // Clear file input
      }
    } catch (err) {
      console.error('Failed to save student:', err);
      setError('Failed to save student data. Please try again.');
    }
  }, [studentId, previewImageUrl, qrCodeDataUrl, editableStudentDetails]);

  const handleDownloadQR = useCallback(() => {
    if (qrCodeDataUrl) {
      const link = document.createElement('a');
      link.href = qrCodeDataUrl;
      link.download = `student_qr_${studentId}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setMessage('QR code downloaded!');
    } else {
      setError('No QR code to download.');
    }
  }, [qrCodeDataUrl, studentId]);

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-3 bg-red-100 text-red-700 border border-red-200 rounded-md">
          {error}
        </div>
      )}
      {message && (
        <div className="p-3 bg-green-100 text-green-700 border border-green-200 rounded-md">
          {message}
        </div>
      )}

      {/* 1. Upload I-Card Photo */}
      <div className="bg-gray-50 p-4 rounded-lg shadow-sm">
        <h3 className="text-xl font-semibold mb-3 text-gray-800">1. Upload Student I-Card Photo</h3>
        <input
          type="file"
          accept="image/jpeg,image/png"
          onChange={handleFileChange}
          ref={fileInputRef}
          className="block w-full text-sm text-gray-900 border border-gray-300 rounded-lg cursor-pointer bg-white focus:outline-none file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
        />
        {previewImageUrl && (
          <div className="mt-4 text-center">
            <h4 className="font-medium text-gray-700 mb-2">I-Card Preview:</h4>
            <img src={previewImageUrl} alt="I-Card Preview" className="max-w-xs mx-auto rounded-lg shadow-md border border-gray-200" />
            <button
              onClick={handleExtractDetails}
              disabled={loading || !selectedFile}
              className="mt-4 px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Extracting...' : 'Extract Details via OCR'}
            </button>
          </div>
        )}
      </div>

      {/* 2. Extracted Details & Fallback */}
      {(ocrResult || selectedFile) && ( // Show fields if OCR attempted or file selected
        <div className="bg-gray-50 p-4 rounded-lg shadow-sm">
          <h3 className="text-xl font-semibold mb-3 text-gray-800">2. Student Details (Editable)</h3>
          {loading && <p className="text-blue-600">Processing OCR...</p>}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="studentName" className="block text-sm font-medium text-gray-700">Student ID:</label>
              <input
                id="studentId"
                type="text"
                value={studentId || 'Generating...'}
                readOnly
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 bg-gray-100 cursor-not-allowed p-2"
              />
            </div>
            <div>
              <label htmlFor="studentName" className="block text-sm font-medium text-gray-700">Name:</label>
              <input
                id="studentName"
                type="text"
                value={editableStudentDetails.name}
                onChange={(e) => setEditableStudentDetails({ ...editableStudentDetails, name: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2"
              />
            </div>
            <div>
              <label htmlFor="fatherName" className="block text-sm font-medium text-gray-700">Father's Name:</label>
              <input
                id="fatherName"
                type="text"
                value={editableStudentDetails.father_name}
                onChange={(e) => setEditableStudentDetails({ ...editableStudentDetails, father_name: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2"
              />
            </div>
            <div>
              <label htmlFor="schoolName" className="block text-sm font-medium text-gray-700">School Name:</label>
              <input
                id="schoolName"
                type="text"
                value={editableStudentDetails.school_name}
                onChange={(e) => setEditableStudentDetails({ ...editableStudentDetails, school_name: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2"
              />
            </div>
            <div>
              <label htmlFor="class" className="block text-sm font-medium text-gray-700">Class:</label>
              <input
                id="class"
                type="text"
                value={editableStudentDetails.class}
                onChange={(e) => setEditableStudentDetails({ ...editableStudentDetails, class: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2"
              />
            </div>
            <div>
              <label htmlFor="section" className="block text-sm font-medium text-gray-700">Section:</label>
              <input
                id="section"
                type="text"
                value={editableStudentDetails.section}
                onChange={(e) => setEditableStudentDetails({ ...editableStudentDetails, section: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2"
              />
            </div>
            <div>
              <label htmlFor="rollNumber" className="block text-sm font-medium text-gray-700">Roll Number:</label>
              <input
                id="rollNumber"
                type="text"
                value={editableStudentDetails.roll_number}
                onChange={(e) => setEditableStudentDetails({ ...editableStudentDetails, roll_number: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2"
              />
            </div>
            <div>
              <label htmlFor="gender" className="block text-sm font-medium text-gray-700">Gender:</label>
              <input
                id="gender"
                type="text"
                value={editableStudentDetails.gender}
                onChange={(e) => setEditableStudentDetails({ ...editableStudentDetails, gender: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2"
              />
            </div>
          </div>
        </div>
      )}

      {/* 3. Generate and Save QR */}
      {studentId && (
        <div className="bg-gray-50 p-4 rounded-lg shadow-sm">
          <h3 className="text-xl font-semibold mb-3 text-gray-800">3. Student QR Code</h3>
          <p className="text-gray-600 mb-4">A unique QR code is generated for student ID: <span className="font-semibold text-blue-700">{studentId}</span></p>
          <QRCodeGenerator text={studentId} onQRCodeGenerated={handleQRCodeGenerated} />
          <div className="flex gap-4 mt-6 justify-center">
            <button
              onClick={handleDownloadQR}
              disabled={!qrCodeDataUrl}
              className="px-6 py-2 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Download QR
            </button>
            <button
              onClick={handleSaveStudent}
              disabled={!studentId || !previewImageUrl || !qrCodeDataUrl || loading}
              className="px-6 py-2 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Save Student & QR
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentRegistration;