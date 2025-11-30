export enum AppTab {
  REGISTER_STUDENT = 'Register Student',
  ATTENDANCE_SCANNER = 'Record Attendance',
  ATTENDANCE_REPORTS = 'Attendance Reports',
}

export interface Student {
  id: string;
  name: string;
  father_name: string;
  school_name: string;
  class: string;
  section: string;
  roll_number: string;
  gender?: string; // Optional, if OCR extracts it or manually set
  icard_image_url: string; // Base64 or Blob URL for I-card photo
  qr_image_url: string; // Base64 or Blob URL for QR image
  created_at: string;
}

export interface AttendanceRecord {
  id: string;
  student_id: string;
  date: string; // YYYY-MM-DD
  status: 'present' | 'absent';
  time: string; // HH:MM:SS
}

export interface OCRResult {
  name: string | null;
  father_name: string | null;
  school_name: string | null;
  class: string | null;
  section: string | null;
  roll_number: string | null;
  gender: string | null;
}

export interface ReportData {
  totalStudents: number;
  totalPresentInPeriod: number; // Renamed from totalPresentToday
  totalAbsentInPeriod: number;  // Renamed from totalAbsentToday
  girlsPresentInPeriod: number; // Renamed from girlsPresentToday
  girlsAbsentInPeriod: number;  // Renamed from girlsAbsentToday
  boysPresentInPeriod: number;  // Renamed from boysPresentToday
  boysAbsentInPeriod: number;   // Renamed from boysAbsentToday
  individualAttendance: {
    [studentId: string]: {
      name: string;
      gender?: string;
      presentDays: number;
      totalDays: number;
      percentage: number;
      history: AttendanceRecord[];
    };
  };
}