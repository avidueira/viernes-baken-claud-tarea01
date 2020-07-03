import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';

export interface Report {
  createdAt: FirebaseFirestore.Timestamp;
  total: number;
  updatedAt: FirebaseFirestore.Timestamp;
}

export const onReportCreateHandler = functions.firestore
  .document('reports/{reportId}')
  .onCreate(async (reportSnap, context) => {
    // For debugging purposes we will log the report data
    const reportData = reportSnap.data(); // would be a good idea to cast as Report
    console.log('New report created:', reportData);
    // Report was created, so now we will add same extra data
    await reportSnap.ref.update({
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
  });
