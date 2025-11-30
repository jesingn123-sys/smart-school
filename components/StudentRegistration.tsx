import React, { useState, useCallback, useRef, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Student, OCRResult } from '../types';
import { performOcr, blobToBase64 } from '../services/geminiService';
import { saveStudent } from '../services/studentService';
import QRCodeGenerator from './QRCodeGenerator';
import {
  FALLBACK_OCR_VALUE,
  DEFAULT_SCHOOL_NAME,
  DEFAULT_SECTION,
  NO_IMAGE_PLACEHOLDER_URL,
  GENDER_OPTIONS,
  CLASS_OPTIONS
} from '../constants';

// Fix: Removed the declare global block.
// window.aistudio is assumed to be pre-configured and accessible in the execution environment.

const StudentRegistration: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [ocrResult, setOcrResult] = useState<OCRResult | null>(null);
  const [studentId, setStudentId] = useState<string>('');
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [manualInputMode, setManualInputMode] = useState<boolean>(false);

  // API Key Management states
  const [hasPaidApiKey, setHasPaidApiKey] = useState<boolean | null>(null); // null means not checked yet
  const [showApiKeyPrompt, setShowApiKeyPrompt] = useState<boolean>(false);

  const checkApiKeyStatus = useCallback(async () => {
    // Fix: Access window.aistudio directly, relying on global availability as per guidelines.
    // If not available, gracefully handle for local dev.
    if (typeof window.aistudio !== 'undefined' && typeof window.aistudio.hasSelectedApiKey === 'function') {
      try {
        const isKeySelected = await window.aistudio.hasSelectedApiKey();
        setHasPaidApiKey(isKeySelected);
        setShowApiKeyPrompt(!isKeySelected);
      } catch (err) {
        console.error('Error checking API key status:', err);
        setError('Failed to check API key status. Please ensure you are in a valid environment.');
        setHasPaidApiKey(false);
        setShowApiKeyPrompt(true);
      }
    } else {
      // For local development outside AI Studio or if aistudio API is not available
      console.warn('window.aistudio.hasSelectedApiKey not available. Assuming API key is configured externally.');
      setHasPaidApiKey(true); // Assume true for local dev
      setShowApiKeyPrompt(false);
    }
  }, []);

  useEffect(() => {
    checkApiKeyStatus();
  }, [checkApiKeyStatus]);

  const handleSelectApiKey = useCallback(async () => {
    // Fix: Access window.aistudio directly, relying on global availability as per guidelines.
    if (typeof window.aistudio !== 'undefined' && typeof window.aistudio.openSelectKey === 'function') {
      try {
        await window.aistudio.openSelectKey();
        // Assume success and proceed; API key will be re-validated on actual API call
        setHasPaidApiKey(true);
        setShowApiKeyPrompt(false);
        setMessage('API Key selected successfully. You can now proceed.');
      } catch (err) {
        console.error('Error opening API key selection dialog:', err);
        setError('Failed to open API key selection. Please try again.');
      }
    } else {
      setError('API Key selection tool not available.');
    }
  }, []);

  // Helper to normalize gender for select
  const normalizeGender = useCallback((gender: string | null) => {
    if (!gender) return GENDER_OPTIONS[0]; // Unknown
    const lowerCaseGender = gender.toLowerCase();
    if (lowerCaseGender.includes('male') || lowerCaseGender.includes('boy')) return 'Male';
    if (lowerCaseGender.includes('female') || lowerCaseGender.includes('girl')) return 'Female';
    if (lowerCaseGender.includes('other')) return 'Other';
    return GENDER_OPTIONS[0]; // Fallback to Unknown
  }, []);

  // Helper to normalize class for select
  const normalizeClass = useCallback((className: string | null) => {
    if (!className) return CLASS_OPTIONS[0]; // Unknown
    const foundClass = CLASS_OPTIONS.find(opt =>
      className.toLowerCase().includes(opt.toLowerCase()) ||
      opt.toLowerCase().includes(className.toLowerCase()) // Handles cases like '9' matching '9th'
    );
    return foundClass || CLASS_OPTIONS[0];
  }, []);

  // Store editable fields derived from OCR, with fallbacks
  const [editableStudentDetails, setEditableStudentDetails] = useState<Omit<Student, 'id' | 'icard_image_url' | 'qr_image_url' | 'created_at'>>({
    name: FALLBACK_OCR_VALUE,
    father_name: FALLBACK_OCR_VALUE,
    school_name: DEFAULT_SCHOOL_NAME,
    class: CLASS_OPTIONS[0], // Default to 'Unknown'
    section: DEFAULT_SECTION,
    roll_number: FALLBACK_OCR_VALUE,
    gender: GENDER_OPTIONS[0], // Default to 'Unknown'
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetForm = useCallback(() => {
    setSelectedFile(null);
    setPreviewImageUrl(null);
    setOcrResult(null);
    setStudentId('');
    setQrCodeDataUrl(null);
    setEditableStudentDetails({
      name: FALLBACK_OCR_VALUE,
      father_name: FALLBACK_OCR_VALUE,
      school_name: DEFAULT_SCHOOL_NAME,
      class: CLASS_OPTIONS[0],
      section: DEFAULT_SECTION,
      roll_number: FALLBACK_OCR_VALUE,
      gender: GENDER_OPTIONS[0],
    });
    if (fileInputRef.current) {
      fileInputRef.current.value = ''; // Clear file input
    }
    setError(null);
    setMessage(null);
  }, []);

  useEffect(() => {
    // Generate a student ID immediately when manual mode is activated or on initial load if manual
    if (manualInputMode && !studentId) {
      setStudentId(uuidv4());
    } else if (!manualInputMode && !studentId && selectedFile) {
      // If OCR mode and file selected, but no ID yet (e.g., first load with file)
      setStudentId(uuidv4());
    }
  }, [manualInputMode, studentId, selectedFile]);


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
      if (!studentId) { // Generate ID if not already generated
        setStudentId(uuidv4());
      }
    } else {
      setSelectedFile(null);
      setPreviewImageUrl(null);
      if (!manualInputMode) { // Only reset OCR results if not in manual mode
        setOcrResult(null);
        setStudentId('');
        setQrCodeDataUrl(null);
        setEditableStudentDetails({
          name: FALLBACK_OCR_VALUE,
          father_name: FALLBACK_OCR_VALUE,
          school_name: DEFAULT_SCHOOL_NAME,
          class: CLASS_OPTIONS[0],
          section: DEFAULT_SECTION,
          roll_number: FALLBACK_OCR_VALUE,
          gender: GENDER_OPTIONS[0],
        });
      }
    }
  }, [manualInputMode, studentId]);

  const handleExtractDetails = useCallback(async () => {
    if (!selectedFile) {
      setError('Please upload an I-Card photo first.');
      return;
    }
    if (!hasPaidApiKey) {
      setError('An API Key from a paid GCP project is required for OCR. Please select one.');
      setShowApiKeyPrompt(true);
      return;
    }

    setLoading(true);
    setError(null);
    setMessage(null);
    setOcrResult(null);
    setQrCodeDataUrl(null);
    if (!studentId) {
      setStudentId(uuidv4()); // Ensure unique ID for QR and student data
    }

    try {
      const base64Image = await blobToBase64(selectedFile);
      const result = await performOcr(base64Image, selectedFile.type);
      setOcrResult(result);

      // Populate editable fields with OCR results or fallbacks
      setEditableStudentDetails({
        name: result.name || FALLBACK_OCR_VALUE,
        father_name: result.father_name || FALLBACK_OCR_VALUE,
        school_name: result.school_name || DEFAULT_SCHOOL_NAME,
        class: normalizeClass(result.class),
        section: result.section || DEFAULT_SECTION,
        roll_number: result.roll_number || FALLBACK_OCR_VALUE,
        gender: normalizeGender(result.gender),
      });

      setMessage('OCR extraction successful. Please review details.');
    } catch (err: any) {
      console.error('OCR or Image conversion failed:', err);
      if (err.message && err.message.includes("Requested entity was not found")) {
        setError('API Key error: The selected API key might be invalid or from a non-paid project. Please select a valid key.');
        setHasPaidApiKey(false); // Force re-selection
        setShowApiKeyPrompt(true);
      } else {
        setError('Failed to extract details from I-Card. Please try again or fill manually.');
      }
      // Keep current fallbacks if OCR completely fails
      setEditableStudentDetails(prev => ({
        ...prev,
        name: prev.name === FALLBACK_OCR_VALUE ? FALLBACK_OCR_VALUE : prev.name,
        father_name: prev.father_name === FALLBACK_OCR_VALUE ? FALLBACK_OCR_VALUE : prev.father_name,
        school_name: prev.school_name === DEFAULT_SCHOOL_NAME ? DEFAULT_SCHOOL_NAME : prev.school_name,
        class: prev.class === CLASS_OPTIONS[0] ? CLASS_OPTIONS[0] : prev.class,
        section: prev.section === DEFAULT_SECTION ? DEFAULT_SECTION : prev.section,
        roll_number: prev.roll_number === FALLBACK_OCR_VALUE ? FALLBACK_OCR_VALUE : prev.roll_number,
        gender: prev.gender === GENDER_OPTIONS[0] ? GENDER_OPTIONS[0] : prev.gender,
      }));
    } finally {
      setLoading(false);
    }
  }, [selectedFile, studentId, normalizeClass, normalizeGender, hasPaidApiKey]);

  const handleQRCodeGenerated = useCallback((dataUrl: string) => {
    setQrCodeDataUrl(dataUrl);
  }, []);

  const handleSaveStudent = useCallback(() => {
    if (!studentId || !qrCodeDataUrl) {
      setError('Please ensure a Student ID is generated and QR is available before saving.');
      return;
    }

    // Check if essential fields are still default fallbacks
    if (editableStudentDetails.name === FALLBACK_OCR_VALUE ||
        editableStudentDetails.roll_number === FALLBACK_OCR_VALUE ||
        editableStudentDetails.class === CLASS_OPTIONS[0] // Class is now required to be selected
        ) {
      setError('Student Name, Roll Number, and Class are essential and cannot be default/N/A. Please correct.');
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
      icard_image_url: previewImageUrl || NO_IMAGE_PLACEHOLDER_URL, // Use placeholder if no image in manual mode
      qr_image_url: qrCodeDataUrl,
      created_at: new Date().toISOString(),
    };

    try {
      saveStudent(newStudent);
      setMessage(`Student "${newStudent.name}" (ID: ${newStudent.id}) registered successfully!`);
      resetForm(); // Reset form after successful save
      checkApiKeyStatus(); // Recheck API key status after saving
    } catch (err) {
      console.error('Failed to save student:', err);
      setError('Failed to save student data. Please try again.');
    }
  }, [studentId, previewImageUrl, qrCodeDataUrl, editableStudentDetails, resetForm, checkApiKeyStatus]);

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

  const handleToggleInputMode = useCallback(() => {
    resetForm(); // Clear current form state
    setManualInputMode((prevMode) => {
      const newMode = !prevMode;
      if (newMode) {
        setStudentId(uuidv4()); // Generate ID immediately for manual mode
      }
      return newMode;
    });
  }, [resetForm]);


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

      {/* API Key Selection Prompt */}
      {showApiKeyPrompt && (
        <div className="p-4 bg-yellow-100 text-yellow-800 border border-yellow-200 rounded-md flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="font-semibold text-center md:text-left">
            To use advanced OCR (powered by `gemini-3-pro-image-preview`), you need to select an API key from a paid GCP project.
          </p>
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              onClick={handleSelectApiKey}
              className="px-4 py-2 bg-yellow-600 text-white font-semibold rounded-lg shadow-md hover:bg-yellow-700 transition-colors duration-200"
            >
              Select API Key
            </button>
            <a
              href="https://ai.google.dev/gemini-api/docs/billing"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-gray-200 text-gray-800 font-semibold rounded-lg shadow-sm hover:bg-gray-300 transition-colors duration-200 text-center"
            >
              Learn about billing
            </a>
          </div>
        </div>
      )}

      {/* Toggle Input Mode */}
      <div className="flex justify-end mb-4">
        <button
          onClick={handleToggleInputMode}
          className="px-4 py-2 bg-gray-200 text-gray-800 font-semibold rounded-lg shadow-sm hover:bg-gray-300 transition-colors duration-200"
        >
          {manualInputMode ? 'Switch to OCR Mode' : 'Switch to Manual Input Mode'}
        </button>
      </div>

      {/* 1. Upload I-Card Photo (Optional in Manual Mode) */}
      <div className="bg-gray-50 p-4 rounded-lg shadow-sm">
        <h3 className="text-xl font-semibold mb-3 text-gray-800">1. {manualInputMode ? 'Upload Student I-Card Photo (Optional)' : 'Upload Student I-Card Photo'}</h3>
        <input
          type="file"
          accept="image/jpeg,image/png"
          onChange={handleFileChange}
          ref={fileInputRef}
          className="block w-full text-sm text-gray-900 border border-gray-300 rounded-lg cursor-pointer bg-white focus:outline-none file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          disabled={hasPaidApiKey === false && !manualInputMode}
        />
        {previewImageUrl && (
          <div className="mt-4 text-center">
            <h4 className="font-medium text-gray-700 mb-2">I-Card Preview:</h4>
            <img src={previewImageUrl} alt="I-Card Preview" className="max-w-xs mx-auto rounded-lg shadow-md border border-gray-200" />
            {!manualInputMode && (
              <button
                onClick={handleExtractDetails}
                disabled={loading || !selectedFile || !hasPaidApiKey}
                className="mt-4 px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Extracting...' : 'Extract Details via OCR'}
              </button>
            )}
          </div>
        )}
      </div>

      {/* 2. Extracted Details & Fallback */}
      <div className="bg-gray-50 p-4 rounded-lg shadow-sm">
        <h3 className="text-xl font-semibold mb-3 text-gray-800">2. Student Details (Editable)</h3>
        {loading && <p className="text-blue-600">Processing OCR...</p>}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="studentIdInput" className="block text-sm font-medium text-gray-700">Student ID:</label>
            <input
              id="studentIdInput"
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
            <select
              id="class"
              value={editableStudentDetails.class}
              onChange={(e) => setEditableStudentDetails({ ...editableStudentDetails, class: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2"
            >
              {CLASS_OPTIONS.map(option => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
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
            <select
              id="gender"
              value={editableStudentDetails.gender}
              onChange={(e) => setEditableStudentDetails({ ...editableStudentDetails, gender: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2"
            >
              {GENDER_OPTIONS.map(option => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 3. Generate and Save QR */}
      {studentId && (
        <div className="bg-gray-50 p-4 rounded-lg shadow-sm">
          <h3 className="text-xl font-semibold mb-3 text-gray-800">3. Student QR Code</h3>
          <p className="text-gray-600 mb-4">A unique QR code is generated for student ID: <span className="font-semibold text-blue-700">{studentId}</span></p>
          {/* Fix: Corrected the QRCodeGenerator component usage */}
          <QRCodeGenerator text={studentId} onQRCodeGenerated={handleQRCodeGenerated} />

          <div className="flex gap-4 mt-6 justify-center">
            <button
              onClick={handleSaveStudent}
              disabled={loading || !studentId || !qrCodeDataUrl || !editableStudentDetails.name || editableStudentDetails.name === FALLBACK_OCR_VALUE}
              className="px-6 py-3 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Save Student & QR
            </button>
            <button
              onClick={handleDownloadQR}
              disabled={!qrCodeDataUrl}
              className="px-6 py-3 bg-gray-600 text-white font-semibold rounded-lg shadow-md hover:bg-gray-700 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Download QR
            </button>
            <button
              onClick={resetForm}
              className="px-6 py-3 bg-red-600 text-white font-semibold rounded-lg shadow-md hover:bg-red-700 transition-colors duration-200"
            >
              Reset Form
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// Fix: Export StudentRegistration as a default export
export default StudentRegistration;