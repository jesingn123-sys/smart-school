export const LOCAL_STORAGE_KEYS = {
  STUDENTS: 'smartSchoolQRAttendance_students',
  ATTENDANCE: 'smartSchoolQRAttendance_attendance',
};

export const FALLBACK_OCR_VALUE = 'N/A';
export const DEFAULT_SCHOOL_NAME = 'Smart School'; // Default if OCR fails
export const DEFAULT_SECTION = 'Unknown';
export const NO_IMAGE_PLACEHOLDER_URL = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='; // A 1x1 transparent GIF

export const GENDER_OPTIONS = ['Unknown', 'Male', 'Female', 'Other'];
export const CLASS_OPTIONS = [
  'Unknown', 'Nursery', 'LKG', 'UKG', '1st', '2nd', '3rd', '4th', '5th',
  '6th', '7th', '8th', '9th', '10th', '11th', '12th'
];


export const OCR_PROMPT = `
You are an expert at extracting information from student I-card images.
Carefully examine the provided image of a student I-card.
Your task is to extract the following specific details:
1.  **name**: The full name of the student. Look for labels like "Name:", "Student Name:", "Student:", etc.
2.  **father_name**: The name of the student's father. Look for labels like "Father's Name:", "Father Name:", "Father:", etc.
3.  **school_name**: The name of the school or institution. This is often prominent at the top of the card.
4.  **class**: The student's class or grade. Look for labels like "Class:", "Grade:", "Std:", etc. Provide values like '1st', '2nd', 'Nursery', '12th'. If not found, use 'Unknown'.
5.  **section**: The student's section or division within their class. Look for labels like "Section:", "Div:", etc. If not found, use 'Unknown'.
6.  **roll_number**: The student's roll number or admission number. Look for labels like "Roll No:", "Roll Number:", "Admission No:", "ID:", "Student ID:", etc.
7.  **gender**: The student's gender (e.g., "Male", "Female"). This might be explicitly labeled or inferred if present. Only use 'Male', 'Female', 'Other', or 'Unknown'.

For each detail, if it is clearly visible and confidently identifiable, extract its value.
If a detail is not explicitly present, is unclear, or you cannot confidently identify it, you MUST return \`null\` for that specific field. Do not make assumptions or fabricate information.

Format your output STRICTLY as a JSON object with the exact keys: 'name', 'father_name', 'school_name', 'class', 'section', 'roll_number', 'gender'.

Example of expected JSON output:
{
  "name": "Arjun Kumar",
  "father_name": "Rajesh Kumar",
  "school_name": "Springfield Public School",
  "class": "9th",
  "section": "B",
  "roll_number": "SA-09-021",
  "gender": "Male"
}
`;