import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

export interface Expense {
  amount: number;
  createdAt: FirebaseFirestore.Timestamp;
  processed: boolean;
  reportId: string;
  updatedAt: FirebaseFirestore.Timestamp;
}

export const onExpenseCreateHandler = functions.firestore
  .document('expenses/{expenseId}')
  .onCreate(async (expenseSnap, context) => {
    // For debugging purposes we will log the expense data
    const expenseData = expenseSnap.data(); // would be a good idea to cast as Expense
    // First we check if we already processed this expense
    if (expenseData.processed) {
      return;
    }
    console.log('New expense created:', expenseData);
    // Expense was created, so now we will add same extra data
    await expenseSnap.ref.update({
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      processed: true,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    // But also we need to update report's total and update time
    // We know that each expense is associated with a reportId, let's find it and update it
    // First we check that a reportId was provided
    if (!expenseData.reportId) {
      console.warn('No reportId was provided!!11!!!');
      return;
    }

    const db = admin.firestore();
    const reportRef = db.collection('reports').doc(expenseData.reportId); // this is only the reference, it could exist or not D:
    const reportSnap = await reportRef.get();
    // We can check if there it is a report by reportId
    if (!reportSnap.exists) {
      console.warn(`No report found with reportId ${expenseData.reportId}`);
      return;
    }

    // It's all good, we can now "safely" update the report
    const reportData = reportSnap.data() || {}; // would be a good idea to cast as Report
    await reportRef.update({
      total: reportData.total + expenseData.amount,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
  });
