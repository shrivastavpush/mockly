"use server"

import { auth, db } from "@/firebase/admin"
import { cookies } from "next/headers"

export async function setSessionCookie(idToken: string) {

  const ONE_WEEK: number = 60 * 60 * 24 * 7 // 1 week

  const cookieStore = await cookies()

  const sessionCookie = await auth.createSessionCookie(idToken, {
    expiresIn: ONE_WEEK * 1000
  })

  cookieStore.set('session', sessionCookie, {
    maxAge: ONE_WEEK,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    sameSite: 'lax'
  })

}

export async function signUp(params: SignUpParams) {
  const { uid, name, email } = params

  try {
    const userRecord = await db.collection('users').doc(uid).get()

    // checking if the user exists
    if (userRecord.exists) {
      return {
        success: false,
        message: 'User already exists. Please sign in instead.'
      }
    }

    // setting the new user
    await db.collection('users').doc(uid).set({
      name, email
    })

    return {
      success: true,
      message: 'User created successfully. Please sign in.'
    }

  } catch (error: any) {
    console.log('Error creating a user', error)

    if (error.code === 'auth/email-already-exists') {
      return {
        success: false,
        message: 'This email is already in use'
      }
    }

    return {
      success: false,
      message: 'Failed to create an account'
    }
  }
}

export async function signIn(params: SignInParams) {
  const { email, idToken } = params

  try {
    const userRecord = await auth.getUserByEmail(email)

    if (!userRecord) {
      return {
        success: false,
        message: 'User Does not exists. Create an account instead.'
      }
    }

    await setSessionCookie(idToken)

  } catch (error) {
    console.log(error)

    return {
      success: false,
      message: 'Failed to log into an account'
    }
  }
}

export async function getCurrentUser(): Promise<User | null> {
  const cookieStore = await cookies()

  const sessionCookie = cookieStore.get('session')?.value

  if (!sessionCookie) return null // user doesn't exists

  try {
    //checking if the cookie present in the cookies are valid current user
    const decodedClaims = await auth.verifySessionCookie(sessionCookie, true)

    const userRecord = await db.collection('users').doc(decodedClaims.uid).get()

    if (!userRecord) return null

    return {
      ...userRecord.data(),
      id: userRecord.id,
    } as User

  } catch (error) {
    console.log(error)
    return null
  }
}

export async function isAuthenticated() {
  const user = await getCurrentUser()

  return !!user // (to convert it into boolean => double negation)
}

// interview created by the current user
export async function getInterviewsByUserId(userId: string): Promise<Interview[] | null> {

  if (!userId) {
    console.warn('getInterviewByUserId was called with undefined userId');
    return null;
  }

  try {
    const interviews = await db
      .collection('interviews')
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .get()

    if (interviews.empty) {
      return null;
    }

    return interviews.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Interview[]
  } catch (error) {
    console.error('Error fetching interviews:', error);
    return null;
  }

}

// interview created by all the user
export async function getLatestInterviews(params: GetLatestInterviewsParams): Promise<Interview[] | null> {

  const { userId, limit = 20 } = params

  if (!userId) {
    console.warn('getInterviewByUserId was called with undefined userId');
    return null;
  }

  try {
    const interviews = await db
      .collection('interviews')
      .orderBy('createdAt', 'desc')
      .where('finalized', '==', true)
      .where('userId', '!=', userId)
      .limit(limit)
      .get()

    if (interviews.empty) {
      return null;
    }

    return interviews.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Interview[]
  } catch (error) {
    console.error('Error fetching interviews:', error);
    return null;
  }

}