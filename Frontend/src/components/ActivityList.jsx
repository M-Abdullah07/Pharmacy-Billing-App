import React from "react";
import { Table, TableBody, TableCaption, TableCell, TableFooter, TableHead, TableHeader, TableRow, } from "@/components/ui/table"
import { Badge } from "./ui/badge";

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
    <div className="flex-1 p-4">
      <h3 className="text-xl font-bold p-6">Recent Activity</h3>
      <Table>
        <TableCaption>A List of Recent Activity</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead className="px-6 py-3 rounded-tl-xl">Name</TableHead>
            <TableHead className="px-9 py-3">ID</TableHead>
            <TableHead className="px-9 py-3">Time</TableHead>
            <TableHead className="px-6 py-3 rounded-tr-xl">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {activities.map((act, index) => (
            <TableRow key={index} >
              <TableCell className="px-6 py-4">{act.name}</TableCell>
              <TableCell className="px-6 py-4">#{act.id}</TableCell>
              <TableCell className="px-6 py-4">{act.time}</TableCell>
              <TableCell className="px-6 py-4">
                <Badge variant={act.status.toLowerCase()}>{act.status}</Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
