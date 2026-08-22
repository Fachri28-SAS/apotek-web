export function rupiah(n) {
  return "Rp" + Number(n || 0).toLocaleString("id-ID");
}
