'use client'

import { generator, interviewer } from '@/constants'
import { createFeedback } from '@/lib/actions/general.action'
import { cn } from '@/lib/utils'
import { vapi } from '@/lib/vapi.sdk'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import React, { useEffect, useState } from 'react'

enum CallStatus {
  INACTIVE = 'INACTIVE',
  CONNECTING = 'CONNECTING',
  ACTIVE = 'ACTIVE',
  FINISHED = 'FINISHED'
}

interface SavedMessage {
  role: 'user' | 'system' | 'assistant'
  content: string
}

const Agent = ({ userName, userId, type, interviewId, questions }: AgentProps) => {
  const router = useRouter()

  const [isSpeaking, setIsSpeaking] = useState(false)
  const [callStatus, setCallStatus] = useState<CallStatus>(CallStatus.INACTIVE)
  const [messages, setMessages] = useState<SavedMessage[]>([])

  useEffect(() => {
    const onCallStart = () => setCallStatus(CallStatus.ACTIVE)
    const onCallEnd = () => setCallStatus(CallStatus.FINISHED)

    const onMessage = (message: Message) => {
      if (message.type === 'transcript' && message.transcriptType === 'final') {
        const newMessages = { role: message.role, content: message.transcript }

        setMessages((prev) => [...prev, newMessages])
      }
    }

    const onSpeechStart = () => setIsSpeaking(true)
    const onSpeechEnd = () => setIsSpeaking(false)

    const onError = (error: Error) => console.error('Error in call:', error)

    vapi.on('call-start', onCallStart)
    vapi.on('call-end', onCallEnd)
    vapi.on('message', onMessage)
    vapi.on('speech-start', onSpeechStart)
    vapi.on('speech-end', onSpeechEnd)
    vapi.on('error', onError)

    return () => {
      vapi.off('call-start', onCallStart)
      vapi.off('call-end', onCallEnd)
      vapi.off('message', onMessage)
      vapi.off('speech-start', onSpeechStart)
      vapi.off('speech-end', onSpeechEnd)
      vapi.off('error', onError)
    }
  }, [])

  useEffect(() => {
    if (callStatus === CallStatus.FINISHED) {
      if (type === 'generate') {
        router.push('/')
      } else {
        handleGenerateFeedback(messages)
      }
    }
  }, [callStatus, type, messages, userId])

  const handleGenerateFeedback = async (messages: SavedMessage[]) => {
    console.log('generate feedback')

    // const { success, feedbackId: id } = await createFeedback({
    //   interviewId: interviewId!,
    //   userId: userId!,
    //   transcript: messages,
    // })

    // if (success && id) {
    //   router.push(`/interview/${interviewId}/feedback/${id}`)
    // } else {
    //   console.error('Failed to save feedback')
    //   router.push(`/`)
    // }
  }

  const handleCall = async () => {
    setCallStatus(CallStatus.CONNECTING)

    if (type === 'generate') {
      await vapi.start(generator, {
        variableValues: {
          userid: userId,
          username: userName,
        }
      })
    } else {
      let formattedQuestions = ''

      if (questions?.length > 0) {
        formattedQuestions = questions
          .map((question) => `- ${question}`)
          .join('\n')
      }

      await vapi.start(interviewer, {
        variableValues: {
          questions: formattedQuestions,
        }
      })
    }
  }

  const handleDisconnect = async () => {
    setCallStatus(CallStatus.FINISHED)
    await vapi.stop()
  }

  const latestMessage = messages[messages.length - 1]?.content
  const isCallInactiveOrFinished = callStatus === CallStatus.INACTIVE || callStatus === CallStatus.FINISHED

  return (
    <>
      {/* agent-card */}
      <div className='call-view'>
        <div className='card-interviewer'>
          <div className='avatar'>
            <Image
              src='/ai-avatar.png'
              alt='vapi-agent'
              width={65}
              height={54}
              className='object-cover'
            />
            {isSpeaking && <span className='animate-speak' />}
          </div>

          <h3>AI interviewer</h3>
        </div>

        {/*  Interviewe card*/}
        <div className='card-border'>
          <div className='card-content'>
            <Image
              src='/user-avatar.png'
              alt='user avatar'
              width={540}
              height={540}
              className='rounded-full object-cover size-[120px]'
            />

            <h3>{userName}</h3>
          </div>
        </div>
      </div>

      {/* messages */}
      {messages.length > 0 && (
        <div className='transcript-border'>
          <div className='transcript'>
            <p key={latestMessage}
              className={cn('transition-opacity duration-500 opacity-0', 'animate-fadeIn opacity-100')}>
              {latestMessage}
            </p>
          </div>
        </div>
      )}

      <div className='w-full flex justify-center'>
        {isCallInactiveOrFinished
          ? (
            <button
              className='relative btn-call cursor-pointer'
              onClick={handleCall}>
              <span
                className={cn('absolute animate-ping rounded-full opacity-75',
                  callStatus !== CallStatus.CONNECTING && 'hidden')} />

              <span>
                {isCallInactiveOrFinished ? 'Call' : '. . .'}
              </span>
            </button>
          ) : (
            <button
              className='btn-disconnect cursor-pointer'
              onClick={handleDisconnect}
            >End
            </button>
          )
        }
      </div>
    </>
  )
}

export default Agent