import { useState } from "react"
import { Table, TableRow, TableHead, TableBody, TableCell, TableHeader } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"

const expiry_data = [
  {
    product: "Panadol",
    form: "Tablet",
    quantity: "40",
    retail: "30",
    shelf: "4C",
    expiry: "12-Mar-25",
  },
  {
    product: "Brufen",
    form: "Tablet",
    quantity: "120",
    retail: "64",
    shelf: "13B",
    expiry: "12-Mar-25",
  },
]

// TODO(demon_slayer): make a button for the user
// to be able to delete the expired stock
//
// TODO(demon_slayer): red-colored dates that are
// <10 days to and past exp?

export default function ExpiryManagement() {
  const [loading, _] = useState(false)
  const [search, setSearch] = useState("")
  // TODO(demon_slayer): Add sort by date?
  const filterData = expiry_data.filter(ed => ed.product.toLowerCase().includes(search.toLowerCase()))

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
                {filterData.map((ed, idx) => (
                  <TableRow key={idx}>
                    <TableCell>{ed.product}</TableCell>
                    <TableCell>{ed.form}</TableCell>
                    <TableCell>{ed.quantity}</TableCell>
                    <TableCell>{ed.retail}</TableCell>
                    <TableCell>{ed.shelf}</TableCell>
                    <TableCell>{ed.expiry}</TableCell>
                  </TableRow>
                ))}
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

