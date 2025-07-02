import React, { useState, useEffect } from "react";
import { format } from "date-fns";
import { supabase } from "../../lib/supabase";
import { useApp } from "../../contexts/AppContext";
import { saveAs } from "file-saver";
import jsPDF from "jspdf";
import "jspdf-autotable";

export default function TransactionList() {
  const { selectedFirm } = useApp();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState("all");

  useEffect(() => {
    if (selectedFirm) fetchTransactions();
  }, [selectedFirm]);

  const fetchTransactions = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("transactions")
      .select("*, user_profiles(full_name)")
      .eq("firm_id", selectedFirm?.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Failed to fetch transactions:", error);
    } else {
      setTransactions(data || []);
    }
    setLoading(false);
  };

  const filteredTransactions = transactions.filter((t) => {
    if (filterType === "all") return true;
    return t.type === filterType;
  });

  const handleDownloadCSV = () => {
    const headers = ["Date", "Type", "Amount", "Status", "Created By"];
    const rows = filteredTransactions.map((t) => [
      format(new Date(t.created_at), "dd-MM-yyyy"),
      t.type,
      t.amount,
      t.status,
      t.user_profiles?.full_name || "Unknown"
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    saveAs(encodedUri, "transactions.csv");
  };

  const handleDownloadPDF = () => {
    const doc = new jsPDF({ orientation: "portrait" });
    doc.setTextColor(0);
    doc.setFontSize(12);
    doc.text("Transactions Report", 14, 14);

    const tableData = filteredTransactions.map((t) => [
      format(new Date(t.created_at), "dd-MM-yyyy"),
      t.type,
      t.amount,
      t.status,
      t.user_profiles?.full_name || "Unknown"
    ]);

    doc.autoTable({
      head: [["Date", "Type", "Amount", "Status", "Created By"]],
      body: tableData,
      startY: 20,
      styles: { fillColor: [255, 255, 255], textColor: 0 },
      headStyles: { fillColor: [0, 0, 0], textColor: 255 },
    });

    doc.save("transactions.pdf");
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">All Transactions</h2>
        <div className="flex space-x-2">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="border px-2 py-1 rounded"
          >
            <option value="all">All</option>
            <option value="sale">Sales</option>
            <option value="collection">Collections</option>
            <option value="payment">Payments</option>
          </select>
          <button
            onClick={handleDownloadCSV}
            className="px-3 py-1 bg-blue-600 text-white rounded"
          >
            Export CSV
          </button>
          <button
            onClick={handleDownloadPDF}
            className="px-3 py-1 bg-gray-800 text-white rounded"
          >
            Download PDF
          </button>
        </div>
      </div>
      {loading ? (
        <div className="text-center py-10">Loading...</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full table-auto border">
            <thead>
              <tr className="bg-gray-100 text-left">
                <th className="px-4 py-2">Date</th>
                <th className="px-4 py-2">Type</th>
                <th className="px-4 py-2">Amount</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Created By</th>
              </tr>
            </thead>
            <tbody>
              {filteredTransactions.map((t) => (
                <tr key={t.id} className="border-t">
                  <td className="px-4 py-2">
                    {format(new Date(t.created_at), "dd-MM-yyyy")}
                  </td>
                  <td className="px-4 py-2 capitalize">{t.type}</td>
                  <td className="px-4 py-2">₹{t.amount}</td>
                  <td className="px-4 py-2 capitalize">{t.status}</td>
                  <td className="px-4 py-2">
                    {t.user_profiles?.full_name || "Unknown"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
