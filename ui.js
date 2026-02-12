import { $ } from './utils.js'

export function toggleLoading(show) {
	$('loadingOverlay').style.display = show ? 'flex' : 'none'
}

export function showMsg(text, type = 'success') {
	const container = $('toastContainer')
	const toast = document.createElement('div')
	toast.className = `toast ${type}`
	toast.innerHTML = `<span>${type === 'success' ? '✅' : '❌'}</span> <span>${text}</span>`
	container.appendChild(toast)
	setTimeout(() => {
		toast.classList.add('fade-out')
		setTimeout(() => toast.remove(), 300)
	}, 4000)
}

export function switchTab(id) {
	document.querySelectorAll('.tab, [data-main]').forEach(el => el.classList.remove('active'))
	$(id).classList.add('active')
	const btn = document.querySelector(`[data-main="${id}"]`)
	if (btn) btn.classList.add('active')
}

export function clearFields() {
	;['nome', 'cpf', 'motivo', 'arquivoInput', 'motivoNovo'].forEach(id => {
		const el = $(id)
		if (el) el.value = ''
	})
}

export function clearRecForm() {
	;['recBanco', 'recCpf', 'recNome', 'recDesc'].forEach(id => {
		const el = $(id)
		if (el) el.value = ''
	})
}
