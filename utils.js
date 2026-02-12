export const $ = id => document.getElementById(id)

export function maskCPF(v) {
	v = v.replace(/\D/g, '').slice(0, 11)
	if (v.length > 9) v = v.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
	else if (v.length > 6) v = v.replace(/(\d{3})(\d{3})(\d+)/, '$1.$2.$3')
	else if (v.length > 3) v = v.replace(/(\d{3})(\d+)/, '$1.$2')
	return v
}

export const onlyDigits = str => (str || '').replace(/\D+/g, '')

export function formatCPF(raw) {
	const d = onlyDigits(raw)
	return d.length === 11 ? `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}` : raw
}
