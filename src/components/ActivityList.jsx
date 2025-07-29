// src/components/ActivityList.jsx
import React from "react";
import "../styles/ActivityList.css";

const activities = [
  { name: "Ralph Edwards", id: 6527, time: "10:32 am", status: "Delivered" },
  { name: "Olivia Ander", id: 6528, time: "10:33 am", status: "Pending" },
  { name: "Ralph Edwards", id: 6529, time: "10:34 am", status: "Cancelled" },
  { name: "Liam Mitchell", id: 6530, time: "10:35 am", status: "Delivered" },
  { name: "Noah Richards", id: 6531, time: "10:36 am", status: "Pending" },
  { name: "Sophia Bennett", id: 6532, time: "10:37 am", status: "Cancelled" },
  { name: "Emily Taylor", id: 6533, time: "10:38 am", status: "Delivered" },
];

export default function ActivityList() {
  return (
    <div className="activity-list">
      <h3>Recent Activity</h3>
      <ul>
        {activities.map((act, index) => (
          <li key={index}>
            <span className="name">{act.name}</span>
            <span className="id">#{act.id}</span>
            <span className="time">{act.time}</span>
            <span className={`status ${act.status.toLowerCase()}`}>{act.status}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}