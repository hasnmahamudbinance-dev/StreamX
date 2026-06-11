let admin: any = null;
let initialized = false;

try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  admin = require('firebase-admin');
  
  if (!admin.apps || !admin.apps.length) {
    const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n');

    if (projectId && clientEmail && privateKey) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      });
      initialized = true;
    }
  } else {
    initialized = true;
  }
} catch {
  // firebase-admin not available (e.g., during build or not installed)
  console.warn('firebase-admin not available - push notifications disabled');
}

export { admin };

export function isFirebaseAdminAvailable(): boolean {
  return initialized && admin !== null && admin.apps && admin.apps.length > 0;
}

export async function sendPushNotification(
  token: string,
  title: string,
  body: string,
  data?: Record<string, string>
): Promise<boolean> {
  try {
    if (!isFirebaseAdminAvailable()) {
      console.log('Push notification (demo):', { token: token.substring(0, 20) + '...', title, body });
      return true;
    }

    await admin.messaging().send({
      token,
      notification: { title, body },
      data: data || {},
    });
    return true;
  } catch (error) {
    console.error('Push notification send error:', error);
    return false;
  }
}
