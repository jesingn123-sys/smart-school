import React, { useState } from 'react';
import StudentRegistration from './components/StudentRegistration';
import AttendanceScanner from './components/AttendanceScanner';
import AttendanceReports from './components/AttendanceReports';
import Layout from './components/Layout';
import { AppTab } from './types';

// Fix: Changed return type from JSX.Element to React.ReactElement to resolve "Cannot find namespace 'JSX'"
function App(): React.ReactElement {
  const [activeTab, setActiveTab] = useState<AppTab>(AppTab.REGISTER_STUDENT);

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
      {activeTab === AppTab.REGISTER_STUDENT && <StudentRegistration />}
      {activeTab === AppTab.ATTENDANCE_SCANNER && <AttendanceScanner />}
      {activeTab === AppTab.ATTENDANCE_REPORTS && <AttendanceReports />}
    </Layout>
  );
}

export default App;