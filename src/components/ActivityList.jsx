// src/components/ActivityList.jsx
import React from "react";

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
    <div className="flex-1 bg-white p-4">
      <h3 className="text-xl font-bold p-6">Recent Activity</h3>
      <table className="w-full table-auto border-separate border-spacing-0 rounded-xl overflow-hidden shadow">
        <thead>
          <tr className="bg-gray-200 text-left text-gray-800 uppercase tracking-wider">
            <th className="px-6 py-3 rounded-tl-xl">Name</th>
            <th className="px-9 py-3">ID</th>
            <th className="px-9 py-3">Time</th>
            <th className="px-6 py-3 rounded-tr-xl">Status</th>
          </tr>
        </thead>
        <tbody>
          {activities.map((act, index) => (
            <tr key={index} className="hover:bg-gray-300 transition-colors">
              <td className="px-6 py-4">{act.name}</td>
              <td className="px-6 py-4">#{act.id}</td>
              <td className="px-6 py-4">{act.time}</td>
              <td className="px-6 py-4">{act.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
