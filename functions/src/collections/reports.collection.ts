import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';

export interface Report {
  createdAt: FirebaseFirestore.Timestamp;
  total: number;
  updatedAt: FirebaseFirestore.Timestamp;
}

export const onReportCreateHandler = functions.firestore.document('reports/{reportId}').onCreate(async (reportSnap, context) => {
  // For debugging purposes we will log the report data
  const reportData = reportSnap.data() as Report;
  console.log('New report created:', reportData);
  // Report was created, so now we will add same extra data
  await reportSnap.ref.update({
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  });
});

export const onReportDeleteHandler = functions.firestore.document('reports/{reportId}').onDelete(async (reportSnap) => {
  const db = admin.firestore();
  const limit = 100;
  let offset = 0;
  let count = 0;
  let batch = db.batch();
  while (true) {
    const expensesQuerySnap = await db.collection('expenses')
      .where('reportId', '==', reportSnap.id)
      .offset(offset)
      .limit(limit).get();
    console.debug(`Expenses retrieved: ${expensesQuerySnap.size}`);
    for (const expenseSnap of expensesQuerySnap.docs) {
      if (!expenseSnap.exists) {
        continue; // already deleted
      }
      batch.delete(expenseSnap.ref);
      count++;
      if (count % 499 === 0) {
        console.debug(`Partial batch commit at: ${count}`);
        await batch.commit();
        batch = db.batch();
      }
    }
    offset += limit;
    if (expensesQuerySnap.size < limit) {
      break;
    }
  }
  if (count % 499 !== 0) {
    console.debug(`Final batch commit at: ${count}`);
    await batch.commit();
  }
});

