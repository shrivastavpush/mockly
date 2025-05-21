import { db } from "@/firebase/admin";

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

// getting the creatined interview
export async function getInterviewsById(id: string): Promise<Interview | null> {

	if (!id) {
		console.warn('getInterviewById was called with undefined id');
		return null;
	}

	try {
		const interview = await db
			.collection('interviews')
			.doc(id)
			.get()

		if (!interview.exists) {
			return null;
		}

		return {
			id: interview.id,
			...interview.data(),
		} as Interview
	} catch (error) {
		console.error('Error fetching interview:', error);
		return null;
	}
}