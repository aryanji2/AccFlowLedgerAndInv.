import React, { useState, useEffect } from "react";
import { format } from "date-fns";
import { supabase } from "../../lib/supabase";
import { useApp } from "../../contexts/AppContext";
import { saveAs } from "file-saver";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default function TransactionList() {
  const { selectedFirm } = useApp();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [staffList, setStaffList] = useState([]);
  const [filterStaff, setFilterStaff] = useState("all");

  useEffect(() => {
    if (selectedFirm) {
      fetchTransactions();
      fetchStaffList();
    }
  }, [selectedFirm]);

  const fetchTransactions = async () => {
    setLoading(true);
    let query = supabase
      .from("transactions")
      .select("*, user_profiles(full_name)")
      .eq("firm_id", selectedFirm?.id)
      .order("created_at", { ascending: false });

    if (startDate) query = query.gte("transaction_date", startDate);
    if (endDate) query = query.lte("transaction_date", endDate);

    const { data, error } = await query;

    if (error) {
      console.error("Failed to fetch transactions:", error);
    } else {
      setTransactions(data || []);
    }
    setLoading(false);
  };

  const fetchStaffList = async () => {
    const { data, error } = await supabase
      .from("user_firm_access")
      .select("user_id, user_profiles(id, full_name)")
      .eq("firm_id", selectedFirm?.id);

    if (!error) {
      const staff = data.map((item) => ({
        id: item.user_profiles?.id || item.user_id,
        name: item.user_profiles?.full_name || "Unknown",
      }));
      setStaffList(staff);
    }
  };

  const filteredTransactions = transactions.filter((t) => {
    const matchType = filterType === "all" || t.type === filterType;
    const matchStatus = filterStatus === "all" || t.status === filterStatus;
    const matchStaff = filterStaff === "all" || t.created_by === filterStaff;
    return matchType && matchStatus && matchStaff;
  });

  const handleDownloadCSV = () => {
    const headers = ["Date", "Type", "Amount", "Status", "Created By"];
    const rows = filteredTransactions.map((t) => [
      format(new Date(t.created_at), "dd-MM-yyyy"),
      t.type,
      t.amount,
      t.status,
      t.user_profiles?.full_name || "Unknown",
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
      t.user_profiles?.full_name || "Unknown",
    ]);

    autoTable({
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
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="border px-2 py-1 rounded"
          />
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="border px-2 py-1 rounded"
          />
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="border px-2 py-1 rounded"
          >
            <option value="all">All Types</option>
            <option value="sale">Sales</option>
            <option value="collection">Collections</option>
            <option value="payment">Payments</option>
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="border px-2 py-1 rounded"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
          <select
            value={filterStaff}
            onChange={(e) => setFilterStaff(e.target.value)}
            className="border px-2 py-1 rounded"
          >
            <option value="all">All Staff</option>
            {staffList.map((staff) => (
              <option key={staff.id} value={staff.id}>{staff.name}</option>
            ))}
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
