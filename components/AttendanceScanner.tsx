import React, { useState, useEffect, useRef, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { getStudentById } from '../services/studentService';
import { saveAttendanceRecord, isStudentAlreadyPresentToday, getAttendanceByDate } from '../services/attendanceService';
import { AttendanceRecord, Student } from '../types';

declare global {
  interface Window {
    Html5QrcodeScanner: typeof Html5QrcodeScanner;
  }
}

interface AttendanceEntryProps {
  student: Student;
  record: AttendanceRecord;
}

const AttendanceEntry: React.FC<AttendanceEntryProps> = ({ student, record }) => {
  return (
    <div className="flex items-center justify-between p-3 border-b border-gray-200 last:border-b-0 bg-white hover:bg-gray-50 transition-colors duration-150">
      <div className="flex items-center space-x-3">
        {student.icard_image_url ? (
          <img src={student.icard_image_url} alt={`${student.name}'s I-Card`} className="w-12 h-12 rounded-full object-cover border border-gray-300" />
        ) : (
          <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 font-bold text-sm">
            IMG
          </div>
        )}
        <div>
          <p className="font-semibold text-gray-800">{student.name}</p>
          <p className="text-sm text-gray-600">Roll: {student.roll_number} | Class: {student.class}-{student.section}</p>
        </div>
      </div>
      <div className="text-right">
        <p className="text-sm text-gray-700 font-medium">Status: <span className="text-green-600 font-bold">{record.status.toUpperCase()}</span></p>
        <p className="text-xs text-gray-500">{record.time}</p>
      </div>
    </div>
  );
};

const AttendanceScanner: React.FC = () => {
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isScannerActive, setIsScannerActive] = useState<boolean>(false);
  const [todayAttendance, setTodayAttendance] = useState<AttendanceRecord[]>([]);

  const html5QrcodeScannerRef = useRef<Html5QrcodeScanner | null>(null);
  const scannedStudentsRef = useRef<Set<string>>(new Set()); // To prevent immediate re-scans

  const getFormattedDate = useCallback(() => {
    const today = new Date();
    return today.toISOString().split('T')[0]; // YYYY-MM-DD
  }, []);

  const getFormattedTime = useCallback(() => {
    const now = new Date();
    return now.toTimeString().split(' ')[0]; // HH:MM:SS
  }, []);

  const fetchTodayAttendance = useCallback(() => {
    const today = getFormattedDate();
    setTodayAttendance(getAttendanceByDate(today));
  }, [getFormattedDate]);

  useEffect(() => {
    fetchTodayAttendance(); // Load initial attendance for today
  }, [fetchTodayAttendance]);

  const onScanSuccess = useCallback(async (decodedText: string) => {
    // Prevent immediate re-scan of the same QR if scanner is still active
    if (scannedStudentsRef.current.has(decodedText)) {
      setMessage(`Student with ID ${decodedText} was just scanned. Waiting for next unique scan.`);
      // Optionally clear after some time if no new scan
      setTimeout(() => {
        if (message === `Student with ID ${decodedText} was just scanned. Waiting for next unique scan.`) {
          setMessage(null);
        }
      }, 3000);
      return;
    }

    scannedStudentsRef.current.add(decodedText);
    setTimeout(() => scannedStudentsRef.current.delete(decodedText), 3000); // Allow re-scan after 3 seconds

    setScanResult(decodedText);
    setMessage(null);
    setError(null);

    const student = getStudentById(decodedText);
    const today = getFormattedDate();
    const currentTime = getFormattedTime();

    if (!student) {
      setError(`Student with ID ${decodedText} not found in database.`);
      return;
    }

    if (isStudentAlreadyPresentToday(decodedText, today)) {
      setMessage(`Student "${student.name}" (Roll: ${student.roll_number}) already marked PRESENT for today.`);
      return;
    }

    const newRecord: AttendanceRecord = {
      id: uuidv4(),
      student_id: decodedText,
      date: today,
      status: 'present',
      time: currentTime,
    };

    try {
      saveAttendanceRecord(newRecord);
      setMessage(`Attendance marked PRESENT for student "${student.name}" (Roll: ${student.roll_number})!`);
      fetchTodayAttendance(); // Update the list instantly
    } catch (err) {
      console.error('Failed to save attendance record:', err);
      setError('Failed to record attendance. Please try again.');
    }
  }, [getFormattedDate, getFormattedTime, fetchTodayAttendance, message]);

  const onScanError = useCallback((errorMessage: string) => {
    // These are critical errors related to camera access or availability
    if (errorMessage.includes("No video device") || errorMessage.includes("Permission denied") || errorMessage.includes("NotAllowedError")) {
        setError(`Camera error: ${errorMessage}. Please ensure camera is connected and permissions are granted.`);
        // Attempt to stop and clear the scanner gracefully if a critical error occurs
        if (html5QrcodeScannerRef.current) {
            html5QrcodeScannerRef.current.clear().catch((err) => console.error("Error clearing scanner on critical error:", err));
            html5QrcodeScannerRef.current = null; // Ensure re-initialization on next start
        }
        setIsScannerActive(false); // Update UI state
    } else {
        // Suppress constant "no QR code found" type errors, only show critical ones
        if (!errorMessage.includes("No QR code found") && !errorMessage.includes("reader already running")) {
            console.warn(`QR Scan Error: ${errorMessage}`);
            // setError(`Scan error: ${errorMessage}`); // Consider enabling this for more verbose debugging if needed
        }
    }
  }, []);

  const startScanner = useCallback(() => {
    setError(null);
    setMessage(null);
    setIsScannerActive(true); // Set active state BEFORE rendering to ensure div exists

    // Small delay to ensure DOM element is rendered if state change causes re-render
    setTimeout(() => {
        if (!document.getElementById("qr-code-reader")) {
            console.error("qr-code-reader element not found. Cannot start scanner.");
            setError("Cannot start scanner: Required camera element not found. Please try again.");
            setIsScannerActive(false);
            return;
        }

        if (window.Html5QrcodeScanner) {
            if (!html5QrcodeScannerRef.current) {
                console.log("Creating new Html5QrcodeScanner instance.");
                html5QrcodeScannerRef.current = new window.Html5QrcodeScanner(
                    "qr-code-reader",
                    { fps: 10, qrbox: { width: 250, height: 250 }, disableFlip: false }, // Added disableFlip: false for better compatibility
                    false // verbose
                );
            } else {
                console.log("Re-using existing Html5QrcodeScanner instance.");
            }
            
            // Render the scanner
            html5QrcodeScannerRef.current.render(onScanSuccess, onScanError)
                .then(() => setMessage('Scanner started. Please grant camera permission if prompted.'))
                .catch(err => {
                    console.error("Error rendering html5QrcodeScanner:", err);
                    setError(`Failed to start scanner: ${err.message || String(err)}. Ensure camera access is allowed.`);
                    setIsScannerActive(false);
                    if (html5QrcodeScannerRef.current) {
                        html5QrcodeScannerRef.current.clear().catch(() => {});
                        html5QrcodeScannerRef.current = null;
                    }
                });
        } else {
            setError("Html5QrcodeScanner library not loaded.");
            setIsScannerActive(false);
        }
    }, 100); // Give React some time to render the div
  }, [onScanSuccess, onScanError]);

  const stopScanner = useCallback(() => {
    if (html5QrcodeScannerRef.current) {
      // Use a variable to hold the current ref to avoid null issues during async clear
      const currentScanner = html5QrcodeScannerRef.current;
      html5QrcodeScannerRef.current = null; // Immediately nullify to prevent re-use while clearing

      currentScanner.clear()
        .then(() => {
          setIsScannerActive(false);
          setMessage('Scanner stopped.');
          setError(null);
        })
        .catch(err => {
          console.error("Failed to clear html5QrcodeScanner", err);
          setError("Failed to stop scanner gracefully. You may need to refresh.");
        });
    } else {
      setIsScannerActive(false);
      setMessage('Scanner was already stopped or not initialized.');
    }
  }, []);

  // Cleanup effect
  useEffect(() => {
    return () => {
      // Ensure scanner is stopped when component unmounts
      if (html5QrcodeScannerRef.current) {
        html5QrcodeScannerRef.current.clear().catch(err => {
          console.error("Failed to clear html5QrcodeScanner on unmount", err);
        });
      }
    };
  }, []);

  // Map today's attendance to include student details for rendering
  const attendanceWithStudentDetails = todayAttendance
    .map(record => {
      const student = getStudentById(record.student_id);
      return student ? { record, student } : null;
    })
    .filter(Boolean) as { record: AttendanceRecord; student: Student }[];

  return (
    <div className="space-y-6">
      <div className="flex justify-center gap-4 mb-6">
        {!isScannerActive ? (
          <button
            onClick={startScanner}
            className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 transition-colors duration-200"
          >
            Start Attendance Scanner
          </button>
        ) : (
          <button
            onClick={stopScanner}
            className="px-6 py-3 bg-red-600 text-white font-semibold rounded-lg shadow-md hover:bg-red-700 transition-colors duration-200"
          >
            Stop Scanner
          </button>
        )}
      </div>

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

      {isScannerActive && (
        <div className="bg-gray-50 p-4 rounded-lg shadow-sm flex flex-col items-center">
          <h3 className="text-xl font-semibold mb-3 text-gray-800">Scan QR Code</h3>
          <p className="text-gray-600 mb-4">Point your camera at the student's QR code.</p>
          <div id="qr-code-reader" className="w-full max-w-sm border-2 border-dashed border-gray-300 rounded-lg p-2 bg-white">
            {/* QR code scanner will render here */}
          </div>
          {scanResult && (
            <p className="mt-4 text-gray-700">Last Scanned ID: <span className="font-semibold text-blue-700">{scanResult}</span></p>
          )}
        </div>
      )}

      <div className="bg-gray-50 p-4 rounded-lg shadow-sm">
        <h3 className="text-xl font-semibold mb-3 text-gray-800">Today's Attendance ({getFormattedDate()})</h3>
        {attendanceWithStudentDetails.length === 0 ? (
          <p className="text-gray-600">No attendance recorded yet for today.</p>
        ) : (
          <div className="max-h-96 overflow-y-auto border border-gray-200 rounded-lg">
            {attendanceWithStudentDetails
              .sort((a, b) => a.record.time.localeCompare(b.record.time)) // Sort by time
              .map(({ student, record }) => (
                <AttendanceEntry key={record.id} student={student} record={record} />
              ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AttendanceScanner;