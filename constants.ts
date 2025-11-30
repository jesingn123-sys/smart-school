export const LOCAL_STORAGE_KEYS = {
  STUDENTS: 'smartSchoolQRAttendance_students',
  ATTENDANCE: 'smartSchoolQRAttendance_attendance',
};

export const FALLBACK_OCR_VALUE = 'N/A';
export const DEFAULT_SCHOOL_NAME = 'Smart School'; // Default if OCR fails
export const DEFAULT_CLASS = 'Unknown';
export const DEFAULT_SECTION = 'Unknown';
export const DEFAULT_GENDER = 'Unknown';
export const OCR_PROMPT = `
Extract the following details from the image of a student I-card: 'name', 'father_name', 'school_name', 'class', 'section', 'roll_number', 'gender' (if present).
If a field is not explicitly present or clear, return null for that field.
Format the output as a JSON object with keys: name, father_name, school_name, class, section, roll_number, gender.
Example:
{
  "name": "John Doe",
  "father_name": "Richard Doe",
  "school_name": "Central High School",
  "class": "10",
  "section": "A",
  "roll_number": "12345",
  "gender": "Male"
}
`;