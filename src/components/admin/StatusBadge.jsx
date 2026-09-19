const labels = {
  PENDING: 'Chờ xác nhận',
  CONFIRMED: 'Đã xác nhận',
  COMPLETED: 'Hoàn thành',
  CANCELLED: 'Đã hủy',
};

export default function StatusBadge({ status }) {
  return <span className={`admin-status status-${status.toLowerCase()}`}>{labels[status] || status}</span>;
}
