import { useState } from "react"
import { Table, TableRow, TableHead, TableBody, TableCell, TableHeader } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Search } from "lucide-react"

export default function ExpiryManagement() {
  const [loading, setLoading] = useState(false)

  return (
    <>
      <div className="flex flex-col space-y-5">
        <div className="flex gap-2 items-center">
          <Search size={20} />
          <Input
            type="text"
            placeholder="Search"
            className="w-1/2"
          >
          </Input>
        </div>
        <div className="flex flex-col items-center justify-center gap-4">
          {loading ? (
            <div>Loading products...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product Name</TableHead>
                  <TableHead>Form</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Retail Price</TableHead>
                  <TableHead>Shelf Location</TableHead>
                  <TableHead>Expiry Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell>xx</TableCell>
                  <TableCell>xx</TableCell>
                  <TableCell>xx</TableCell>
                  <TableCell>xx</TableCell>
                  <TableCell>xx</TableCell>
                  <TableCell>xx</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell colSpan="11">
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          )}
        </div>
      </div>
    </>
  )
}

