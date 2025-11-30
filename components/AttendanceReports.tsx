import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { getStudents } from '../services/studentService';
import { getAttendanceRecords } from '../services/attendanceService';
import { Student, AttendanceRecord, ReportData } from '../types';
import { FALLBACK_OCR_VALUE } from '../constants'; // Fix: Moved import from types.ts to constants.ts

const AttendanceReports: React.FC = () => {
  const getFormattedDate = useCallback((dateObj: Date) => {
    return dateObj.toISOString().split('T')[0]; // YYYY-MM-DD
  }, []);

  const [startDate, setStartDate] = useState<string>(getFormattedDate(new Date()));
  const [endDate, setEndDate] = useState<string>(getFormattedDate(new Date()));
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const calculateReports = useCallback(() => {
    setLoading(true);
    setError(null);
    try {
      const students = getStudents();
      const allAttendance = getAttendanceRecords();

      // Filter attendance records by selected date range
      const attendanceInPeriod = allAttendance.filter(record =>
        record.date >= startDate && record.date <= endDate
      );

      const totalStudents = students.length;

      // Calculate unique students present in the period
      const presentStudentIdsInPeriod = new Set(
        attendanceInPeriod
          .filter(record => record.status === 'present')
          .map(record => record.student_id)
      );

      const totalPresentInPeriod = presentStudentIdsInPeriod.size;
      const totalAbsentInPeriod = totalStudents - totalPresentInPeriod; // Students not present at all in the period

      let girlsPresentInPeriod = 0;
      let girlsAbsentInPeriod = 0;
      let boysPresentInPeriod = 0;
      let boysAbsentInPeriod = 0;

      const studentGenderMap = new Map<string, string>();
      students.forEach(s => {
        studentGenderMap.set(s.id, (s.gender || '').toLowerCase());
      });

      students.forEach(student => {
        const gender = studentGenderMap.get(student.id);
        const isPresentAtLeastOnce = presentStudentIdsInPeriod.has(student.id);

        if (gender === 'female' || gender === 'girl' || gender === 'g') {
          if (isPresentAtLeastOnce) {
            girlsPresentInPeriod++;
          } else {
            girlsAbsentInPeriod++;
          }
        } else if (gender === 'male' || gender === 'boy' || gender === 'b') {
          if (isPresentAtLeastOnce) {
            boysPresentInPeriod++;
          } else {
            boysAbsentInPeriod++;
          }
        }
      });

      // Individual student attendance history
      const individualAttendance: ReportData['individualAttendance'] = {};
      
      students.forEach(student => {
        const studentRecordsInPeriod = attendanceInPeriod.filter(r => r.student_id === student.id);
        const presentDays = new Set(studentRecordsInPeriod.filter(r => r.status === 'present').map(r => r.date)).size;
        const totalAttendanceDaysRecorded = new Set(studentRecordsInPeriod.map(r => r.date)).size;

        const percentage = totalAttendanceDaysRecorded > 0 ? (presentDays / totalAttendanceDaysRecorded) * 100 : 0;

        individualAttendance[student.id] = {
          name: student.name,
          gender: student.gender,
          presentDays,
          totalDays: totalAttendanceDaysRecorded,
          percentage: parseFloat(percentage.toFixed(2)),
          history: studentRecordsInPeriod.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
        };
      });

      setReportData({
        totalStudents,
        totalPresentInPeriod,
        totalAbsentInPeriod,
        girlsPresentInPeriod,
        girlsAbsentInPeriod,
        boysPresentInPeriod,
        boysAbsentInPeriod,
        individualAttendance,
      });
    } catch (err) {
      console.error('Error calculating reports:', err);
      setError('Failed to calculate reports. Please ensure data is available.');
      setReportData(null);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, getFormattedDate]); // Recalculate when dates change

  useEffect(() => {
    calculateReports();
  }, [calculateReports]); // Recalculate when `calculateReports` changes (i.e., when startDate/endDate change)

  if (loading) {
    return <div className="text-blue-600 text-lg font-semibold text-center py-8">Loading reports...</div>;
  }

  if (error) {
    return (
      <div className="p-4 bg-red-100 text-red-700 border border-red-200 rounded-md">
        {error}
      </div>
    );
  }

  if (!reportData) {
    return <div className="text-gray-600 text-center py-8">No report data available. Register students and record attendance.</div>;
  }

  return (
    <div className="space-y-8">
      {/* Date Filter Section */}
      <div className="bg-gray-50 p-4 rounded-lg shadow-sm">
        <h3 className="text-xl font-semibold mb-3 text-gray-800">Filter Attendance by Date</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="startDate" className="block text-sm font-medium text-gray-700">From Date:</label>
            <input
              type="date"
              id="startDate"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2"
            />
          </div>
          <div>
            <label htmlFor="endDate" className="block text-sm font-medium text-gray-700">To Date:</label>
            <input
              type="date"
              id="endDate"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2"
            />
          </div>
        </div>
      </div>

      {/* Overview Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <ReportCard title="Total Students" value={reportData.totalStudents} />
        <ReportCard title="Total Present" value={reportData.totalPresentInPeriod} type="present" />
        <ReportCard title="Total Absent" value={reportData.totalAbsentInPeriod} type="absent" />
      </div>

      {/* Gender-based Attendance */}
      {(reportData.girlsPresentInPeriod > 0 || reportData.girlsAbsentInPeriod > 0 || reportData.boysPresentInPeriod > 0 || reportData.boysAbsentInPeriod > 0) && (
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-2xl font-semibold mb-4 text-gray-800">Gender-wise Attendance (Filtered Period)</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-pink-50 p-4 rounded-lg shadow-sm">
              <h4 className="font-bold text-pink-700 mb-2">Girls</h4>
              <p className="text-lg text-gray-700">Present: <span className="font-semibold text-green-600">{reportData.girlsPresentInPeriod}</span></p>
              <p className="text-lg text-gray-700">Absent: <span className="font-semibold text-red-600">{reportData.girlsAbsentInPeriod}</span></p>
            </div>
            <div className="bg-blue-50 p-4 rounded-lg shadow-sm">
              <h4 className="font-bold text-blue-700 mb-2">Boys</h4>
              <p className="text-lg text-gray-700">Present: <span className="font-semibold text-green-600">{reportData.boysPresentInPeriod}</span></p>
              <p className="text-lg text-gray-700">Absent: <span className="font-semibold text-red-600">{reportData.boysAbsentInPeriod}</span></p>
            </div>
          </div>
        </div>
      )}

      {/* Individual Student Attendance History */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-2xl font-semibold mb-4 text-gray-800">Individual Student Attendance History (Filtered Period)</h3>
        {Object.keys(reportData.individualAttendance).length === 0 ? (
          <p className="text-gray-600">No individual attendance history available for this period.</p>
        ) : (
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {Object.values(reportData.individualAttendance)
              .sort((a, b) => a.name.localeCompare(b.name))
              .map(studentReport => (
                <StudentAttendanceCard key={studentReport.name} studentReport={studentReport} />
              ))}
          </div>
        )}
      </div>
    </div>
  );
};

interface ReportCardProps {
  title: string;
  value: number;
  type?: 'present' | 'absent' | 'total';
}

const ReportCard: React.FC<ReportCardProps> = ({ title, value, type = 'total' }) => {
  const colorClass = useMemo(() => {
    if (type === 'present') return 'bg-green-100 text-green-800';
    if (type === 'absent') return 'bg-red-100 text-red-800';
    return 'bg-blue-100 text-blue-800';
  }, [type]);

  return (
    <div className={`p-6 rounded-lg shadow-md text-center ${colorClass}`}>
      <h4 className="text-lg font-medium">{title}</h4>
      <p className="mt-2 text-5xl font-extrabold">{value}</p>
    </div>
  );
};

interface StudentAttendanceCardProps {
  studentReport: ReportData['individualAttendance'][string];
}

const StudentAttendanceCard: React.FC<StudentAttendanceCardProps> = ({ studentReport }) => {
  const [showHistory, setShowHistory] = useState<boolean>(false);

  return (
    <div className="border border-gray-200 rounded-lg p-4 bg-gray-50 shadow-sm">
      <div className="flex justify-between items-center">
        <div>
          <h4 className="text-xl font-semibold text-gray-800">{studentReport.name}</h4>
          <p className="text-sm text-gray-600">Gender: {studentReport.gender || FALLBACK_OCR_VALUE}</p>
        </div>
        <div className="text-right">
          <p className="text-lg font-medium text-gray-700">Attendance: <span className="text-blue-700">{studentReport.percentage}%</span></p>
          <p className="text-sm text-gray-600">{studentReport.presentDays} / {studentReport.totalDays} days present</p>
        </div>
      </div>
      {studentReport.history.length > 0 && (
        <button
          onClick={() => setShowHistory(!showHistory)}
          className="mt-3 px-4 py-2 text-sm bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors duration-200"
        >
          {showHistory ? 'Hide History' : 'View History'}
        </button>
      )}
      {showHistory && studentReport.history.length > 0 && (
        <div className="mt-4 border-t border-gray-200 pt-4 max-h-48 overflow-y-auto">
          <h5 className="font-semibold text-gray-700 mb-2">Detailed History:</h5>
          <ul className="space-y-1">
            {studentReport.history.map((record) => (
              <li key={record.id} className="flex justify-between text-sm text-gray-600">
                <span>{record.date} at {record.time}</span>
                <span className={`font-medium ${record.status === 'present' ? 'text-green-600' : 'text-red-600'}`}>
                  {record.status.toUpperCase()}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default AttendanceReports;