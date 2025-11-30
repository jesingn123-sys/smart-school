import { Student } from '../types';
import { LOCAL_STORAGE_KEYS } from '../constants';

/**
 * Retrieves all students from local storage.
 * @returns An array of Student objects.
 */
export const getStudents = (): Student[] => {
  try {
    const studentsJson = localStorage.getItem(LOCAL_STORAGE_KEYS.STUDENTS);
    return studentsJson ? (JSON.parse(studentsJson) as Student[]) : [];
  } catch (error) {
    console.error('Failed to parse students from localStorage', error);
    return [];
  }
};

/**
 * Saves a new student to local storage.
 * @param student The student object to save.
 */
export const saveStudent = (student: Student): void => {
  const students = getStudents();
  students.push(student);
  localStorage.setItem(LOCAL_STORAGE_KEYS.STUDENTS, JSON.stringify(students));
};

/**
 * Finds a student by their ID.
 * @param studentId The ID of the student to find.
 * @returns The Student object if found, otherwise undefined.
 */
export const getStudentById = (studentId: string): Student | undefined => {
  const students = getStudents();
  return students.find(s => s.id === studentId);
};

/**
 * Clears all student data from local storage. (For development/reset purposes)
 */
export const clearAllStudents = (): void => {
  localStorage.removeItem(LOCAL_STORAGE_KEYS.STUDENTS);
};