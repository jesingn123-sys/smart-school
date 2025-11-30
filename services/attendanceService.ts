import { AttendanceRecord } from '../types';
import { LOCAL_STORAGE_KEYS } from '../constants';

/**
 * Retrieves all attendance records from local storage.
 * @returns An array of AttendanceRecord objects.
 */
export const getAttendanceRecords = (): AttendanceRecord[] => {
  try {
    const attendanceJson = localStorage.getItem(LOCAL_STORAGE_KEYS.ATTENDANCE);
    return attendanceJson ? (JSON.parse(attendanceJson) as AttendanceRecord[]) : [];
  } catch (error) {
    console.error('Failed to parse attendance from localStorage', error);
    return [];
  }
};

/**
 * Saves a new attendance record to local storage.
 * @param record The attendance record to save.
 */
export const saveAttendanceRecord = (record: AttendanceRecord): void => {
  const records = getAttendanceRecords();
  records.push(record);
  localStorage.setItem(LOCAL_STORAGE_KEYS.ATTENDANCE, JSON.stringify(records));
};

/**
 * Retrieves attendance records for a specific date.
 * @param date The date in YYYY-MM-DD format.
 * @returns An array of AttendanceRecord objects for the given date.
 */
export const getAttendanceByDate = (date: string): AttendanceRecord[] => {
  const records = getAttendanceRecords();
  return records.filter(record => record.date === date);
};

/**
 * Checks if a student has already been marked present for today.
 * @param studentId The ID of the student.
 * @param date The current date in YYYY-MM-DD format.
 * @returns True if the student is already present, false otherwise.
 */
export const isStudentAlreadyPresentToday = (studentId: string, date: string): boolean => {
  const records = getAttendanceByDate(date);
  return records.some(record => record.student_id === studentId && record.status === 'present');
};

/**
 * Clears all attendance data from local storage. (For development/reset purposes)
 */
export const clearAllAttendance = (): void => {
  localStorage.removeItem(LOCAL_STORAGE_KEYS.ATTENDANCE);
};