import { useState } from "react"
import { Input } from "@/components/ui/input";
import { EditIcon, Search } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogHeader, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

export default function StockAdjustment() {
  const [search, setSearch] = useState("")
  const [showEditDialog, setEditDialog] = useState(false)

  return (
    <>
      <div className="flex flex-col space-y-5">
        <div className="flex gap-2 items-center">
          <Search size={20} />
          <Input
            type="text"
            placeholder="Search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-1/2"
          >
          </Input>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product Name</TableHead>
              <TableHead>Form</TableHead>             {/* NOTE(demon_slayer): make this editable? */}
              <TableHead>Quantity</TableHead>         {/* This should not be edited manually */}
              <TableHead>Retail Price</TableHead>
              <TableHead>Purchase Price</TableHead>
              <TableHead>Shelf Location</TableHead>
              <TableHead>Edit</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell>Cef-Span</TableCell>
              <TableCell>Suspension</TableCell>
              <TableCell>332</TableCell>
              <TableCell>450</TableCell>
              <TableCell>300</TableCell>
              <TableCell>4C</TableCell>
              <TableCell>
                <Button variant="outline" onClick={() => setEditDialog(true)}>
                  <EditIcon />
                </Button>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>

      <Dialog open={showEditDialog} onOpenChange={setEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Stock</DialogTitle>
            <DialogDescription>
              Select the field to edit from the following
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-3">
            <Input
              type="text"
              placeholder="Product Name"
              required
            />

            <div className="grid grid-cols-2 gap-3">
              <Input
                type="text"
                placeholder="Quantity"
                className="input-class"
                disabled
              />
              <Input
                type="text"
                placeholder="Shelf"
                className="input-class"
              />
              <Input
                type="number"
                placeholder="Retail Price"
                className="input-class"
              />
              <Input
                type="number"
                placeholder="Purchase Price"
                className="input-class"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-4">
            <Button>Save</Button>
            <Button variant="outline" onClick={() => setEditDialog(false)}>
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
