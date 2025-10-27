"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useToast } from "@/components/ui/use-toast"

function EmployeeNoteEditor({
  employeeId,
  month,
  year,
  officeId,
  employeeNotes,
  setEmployeeNotes,
}: {
  employeeId: string
  month: number
  year: number
  officeId: string
  employeeNotes: {
    [key: string]: {
      note: string
      timestamp: number
    }
  }
  setEmployeeNotes: React.Dispatch<
    React.SetStateAction<{
      [key: string]: {
        note: string
        timestamp: number
      }
    }>
  >
}) {
  const noteKey = `${employeeId}-${month}-${year}-${officeId}`
  const existingNote = employeeNotes[noteKey]
  const [noteText, setNoteText] = useState(existingNote?.note || "")
  const [isEditing, setIsEditing] = useState(!existingNote)
  const { toast } = useToast()

  useEffect(() => {
    const currentNoteKey = `${employeeId}-${month}-${year}-${officeId}`
    const currentNote = employeeNotes[currentNoteKey]
    setNoteText(currentNote?.note || "")
    setIsEditing(!currentNote)
  }, [employeeId, month, year, officeId, employeeNotes])

  const handleSaveNote = () => {
    const newNote = {
      note: noteText,
      timestamp: Date.now(),
    }

    setEmployeeNotes((prevNotes) => ({
      ...prevNotes,
      [noteKey]: newNote,
    }))

    setIsEditing(false)
    toast({
      title: "Note saved.",
      description: "Your note has been saved successfully.",
    })
  }

  const handleEditNote = () => {
    setIsEditing(true)
  }

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNoteText(e.target.value)
  }

  return (
    <div className="space-y-2">
      <div className="text-sm font-medium">Note:</div>
      {isEditing ? (
        <div>
          <textarea
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            value={noteText}
            onChange={handleChange}
          />
          <button
            onClick={handleSaveNote}
            className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-secondary/50 h-9 px-4 py-2"
          >
            Save
          </button>
        </div>
      ) : (
        <div>
          {noteText ? (
            <>
              <p className="text-sm">{noteText}</p>
              <button
                onClick={handleEditNote}
                className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-secondary/50 h-9 px-4 py-2"
              >
                Edit
              </button>
            </>
          ) : (
            <button
              onClick={() => setIsEditing(true)}
              className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-secondary/50 h-9 px-4 py-2"
            >
              Add Note
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export default EmployeeNoteEditor
