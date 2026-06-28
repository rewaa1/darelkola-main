"use client";

import { Appointment } from "@prisma/client";
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from "@hello-pangea/dnd";
import { QueueCard } from "./QueueCard";

interface QueueListProps {
  appointments: Appointment[];
  onReorder: (appointmentId: string, newIndex: number) => void;
  onComplete: (appointmentId: string) => void;
  onCancel: (appointmentId: string) => void;
  onNoShow: (appointmentId: string) => void;
}

export function QueueList({
  appointments,
  onReorder,
  onComplete,
  onCancel,
  onNoShow,
}: QueueListProps) {
  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const sourceIndex = result.source.index;
    const destIndex = result.destination.index;

    if (sourceIndex === destIndex) return;

    const appointment = appointments[sourceIndex];
    // Calculate new queue number based on destination
    const destAppointment = appointments[destIndex];
    const newQueueNumber = destAppointment?.queueNumber ?? destIndex + 1;

    onReorder(appointment.id, newQueueNumber);
  };

  // Only CHECKED_IN appointments can be reordered
  const waitingAppointments = appointments.filter(
    (a) => a.status === "CHECKED_IN",
  );

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <Droppable droppableId="queue">
        {(provided) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className="space-y-2"
          >
            {waitingAppointments.map((appointment, index) => (
              <Draggable
                key={appointment.id}
                draggableId={appointment.id}
                index={index}
              >
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    {...provided.dragHandleProps}
                  >
                    <QueueCard
                      appointment={appointment}
                      isDragging={snapshot.isDragging}
                      showDragHandle
                      onComplete={() => onComplete(appointment.id)}
                      onCancel={() => onCancel(appointment.id)}
                      onNoShow={() => onNoShow(appointment.id)}
                    />
                  </div>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </DragDropContext>
  );
}
