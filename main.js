import { AUTH_PASS, AUTH_USER, BANKS, supabaseClient } from './config.js'

const $ = id => document.getElementById(id)

let lastTodos = []
let lastBusca = []

window.onload = () => {
	fillBanks()
	setupTabs()
	setupEventListeners()

	// Estado inicial: Consulta > Todos
	selecionarSubAbaTodos()
	refreshData()
}

function fillBanks() {
	const selects = [$('fBancoConsulta'), $('banco')]
	for (const sel of selects) {
		sel.innerHTML = sel.id.includes('f') ? '<option value="">Todos os Bancos</option>' : ''
		for (const b of BANKS) {
			sel.innerHTML += `<option value="${b}">${b}</option>`
		}
	}
}

async function refreshData() {
	const buscaAtiva = $('q').value.trim()

	// Se houver texto na busca, atualiza os resultados da busca
	if (buscaAtiva) {
		await buscarRegistros()
		return
	}

	// Caso contrário, atualiza a listagem geral
	toggleLoading(true)
	const banco = $('fBancoConsulta').value
	const tbodyTodos = $('tbodyTodos')

	if (tbodyTodos) tbodyTodos.innerHTML = '<tr><td colspan="8">Atualizando...</td></tr>'

	try {
		let query = supabaseClient
			.from('registros')
			.select('*')
			.order('created_at', { ascending: false })

		if (banco) query = query.eq('banco', banco)

		const { data, error } = await query

		if (error) throw error

		lastTodos = data || []
		renderRows(lastTodos, 'tbodyTodos')
	} catch (error) {
		console.error('Erro ao recarregar:', error)
		showMsg('Erro ao filtrar dados.', 'error')
	} finally {
		toggleLoading(false)
	}
}

async function buscarRegistros() {
	const banco = $('fBancoConsulta').value
	const busca = $('q').value.trim()

	if (!busca) {
		if ($('tbodyBusca')) $('tbodyBusca').innerHTML = ''
		lastBusca = []
		return
	}

	toggleLoading(true)
	try {
		let query = supabaseClient
			.from('registros')
			.select('*')
			.order('created_at', { ascending: false })

		if (banco) query = query.eq('banco', banco)
		if (busca) query = query.or(`nome.ilike.%${busca}%,cpf.ilike.%${busca}%`)

		const { data, error } = await query
		if (error) throw error

		lastBusca = data || []
		renderRows(data, 'tbodyBusca')
	} catch (err) {
		showMsg('Erro na busca.', 'error')
	} finally {
		toggleLoading(false)
	}
}

function renderRows(rows, targetId = 'tbodyTodos') {
	const tbody = $(targetId)
	if (!tbody) return
	tbody.innerHTML = ''

	const isAdmin = sessionStorage.getItem('admin') === 'true'

	rows.forEach(r => {
		const date = new Date(r.created_at).toLocaleString('pt-BR')
		const anexoBtn = r.arquivo_url
			? `<a href="${r.arquivo_url}" target="_blank" class="btn-anexo">📎 Ver</a>`
			: '<span style="opacity:0.3; font-size:11px;">Sem anexo</span>'

		const deleteBtn = isAdmin
			? `<button onclick="window.confirmarExclusao('${r.id}', '${r.arquivo_url}')" class="btn-del">🗑️</button>`
			: '<span style="opacity:0.3; font-size:11px;">Restrito</span>'

		tbody.innerHTML += `
            <tr>
              <td>${r.banco || ''}</td>
              <td class="mono">${date}</td>
              <td>${r.nome || ''}</td>
              <td class="mono">${r.cpf || ''}</td>
              <td><span class="badge">${r.tipo || ''}</span></td>
              <td style="max-width: 250px; white-space: normal; word-break: break-word;">${r.motivo || ''}</td>
              <td style="text-align: center;">${anexoBtn}</td>
              <td style="text-align: center;">${deleteBtn}</td>
            </tr>`
	})
}

// Tornar a função global para o onclick do HTML (Necessário em módulos)
window.confirmarExclusao = async (id, url) => {
	if (!confirm('Excluir permanentemente?')) return
	toggleLoading(true)
	try {
		if (url) {
			const fileName = url.split('/').pop()
			await supabaseClient.storage.from('anexos').remove([`uploads/${fileName}`])
		}
		const { error } = await supabaseClient.from('registros').delete().eq('id', id)
		if (error) throw error
		showMsg('Removido com sucesso!')
		refreshData()
	} catch (err) {
		showMsg('Erro ao excluir.', 'error')
	} finally {
		toggleLoading(false)
	}
}

function setupTabs() {
	document.querySelectorAll('[data-main]').forEach(btn => {
		btn.onclick = () => {
			const target = btn.dataset.main
			if (target === 'mainAdmin' && !sessionStorage.getItem('admin')) {
				$('loginBack').style.display = 'flex'
			} else {
				clearFields()
				clearSearch()
				switchTab(target)
				if (target === 'mainConsulta') {
					selecionarSubAbaTodos()
					refreshData()
				}
			}
		}
	})

	document.querySelectorAll('[data-consulta]').forEach(btn => {
		btn.onclick = () => {
			const target = btn.dataset.consulta
			if (target !== 'cBuscar') clearSearch()
			document
				.querySelectorAll('#mainConsulta .tab, [data-consulta]')
				.forEach(el => el.classList.remove('active'))
			$(target).classList.add('active')
			btn.classList.add('active')
		}
	})
}

function selecionarSubAbaTodos() {
	document
		.querySelectorAll('#mainConsulta .tab, [data-consulta]')
		.forEach(el => el.classList.remove('active'))
	$('cTodos').classList.add('active')
	document.querySelector('[data-consulta="cTodos"]').classList.add('active')
}

function setupEventListeners() {
	$('btnEntrar').onclick = () => {
		if ($('loginUser').value === AUTH_USER && $('loginPass').value === AUTH_PASS) {
			sessionStorage.setItem('admin', 'true')
			$('loginBack').style.display = 'none'
			switchTab('mainAdmin')
		} else showMsg('Credenciais inválidas!', 'error')
	}

	$('btnResetLocal').onclick = () => {
		if (confirm('Sair e limpar cache?')) {
			localStorage.clear()
			sessionStorage.clear()
			window.location.reload()
		}
	}

	$('btnSalvar').onclick = addRegistro
	$('btnBuscar').onclick = buscarRegistros
	$('btnRecarregar').onclick = refreshData
	$('fBancoConsulta').onchange = refreshData // Filtro instantâneo
	$('btnCancelLogin').onclick = () => ($('loginBack').style.display = 'none')
	$('btnExportarConsulta').onclick = exportarCSV

	$('btnLimparBusca').onclick = () => {
		$('q').value = ''
		clearSearch()
	}
}

// Utilitários de UI
function toggleLoading(show) {
	$('loadingOverlay').style.display = show ? 'flex' : 'none'
}

function showMsg(text, type = 'success') {
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

function switchTab(id) {
	document.querySelectorAll('.tab, [data-main]').forEach(el => el.classList.remove('active'))
	$(id).classList.add('active')
	document.querySelector(`[data-main="${id}"]`).classList.add('active')
}

function clearFields() {
	$('nome').value = ''
	$('cpf').value = ''
	$('motivo').value = ''
	$('arquivoInput').value = ''
}

function clearSearch() {
	if ($('q')) $('q').value = ''
	$('tbodyBusca').innerHTML = ''
	lastBusca = []
}

// Máscara CPF
$('cpf').oninput = e => {
	let v = e.target.value.replace(/\D/g, '').slice(0, 11)
	if (v.length > 9) v = v.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
	else if (v.length > 6) v = v.replace(/(\d{3})(\d{3})(\d+)/, '$1.$2.$3')
	else if (v.length > 3) v = v.replace(/(\d{3})(\d+)/, '$1.$2')
	e.target.value = v
}

async function addRegistro() {
	const fileInput = $('arquivoInput')
	const file = fileInput.files[0]
	let publicUrl = null

	const item = {
		banco: $('banco').value,
		nome: $('nome').value,
		cpf: $('cpf').value,
		tipo: $('tipo').value,
		motivo: $('motivo').value,
	}

	// Validação básica de campos obrigatórios
	if (!item.nome || !item.cpf || !item.motivo) {
		showMsg('Preencha todos os campos obrigatórios!', 'error')
		return
	}

	toggleLoading(true) // Ativa o spinner de carregamento

	try {
		// 1. Upload do Arquivo para o Storage (se houver um selecionado)
		if (file) {
			const fileExt = file.name.split('.').pop()
			const fileName = `${Date.now()}.${fileExt}`
			const filePath = `uploads/${fileName}`

			const { error: uploadError } = await supabaseClient.storage
				.from('anexos')
				.upload(filePath, file)

			if (uploadError) throw new Error(`Erro no upload: ${uploadError.message}`)

			// Gera a URL pública para salvar no banco
			const { data: urlData } = supabaseClient.storage.from('anexos').getPublicUrl(filePath)
			publicUrl = urlData.publicUrl
		}

		// 2. Salvar Registro na tabela 'registros'
		const { error: dbError } = await supabaseClient
			.from('registros')
			.insert([{ ...item, arquivo_url: publicUrl }])

		if (dbError) throw dbError

		showMsg('Registro salvo com sucesso na nuvem!')
		if (fileInput) fileInput.value = '' // Limpa o input de arquivo
		clearFields() // Limpa os campos de texto

		// Pequeno delay para garantir que o banco processe antes de atualizar a lista
		setTimeout(() => refreshData(), 500)
	} catch (err) {
		showMsg(err.message, 'error')
	} finally {
		toggleLoading(false) // Desativa o spinner
	}
}

function exportarCSV() {
	// Define qual lista exportar: a da busca atual ou a lista completa
	const rows = lastBusca.length ? lastBusca : lastTodos

	if (!rows || !rows.length) {
		showMsg('Não há dados para exportar.', 'error')
		return
	}

	// Define o cabeçalho (deve coincidir com a ordem das colunas)
	const header = ['Banco', 'Data/Hora', 'Nome', 'CPF', 'Tipo', 'Motivo', 'Link do Arquivo']
	const linhas = [header.join(';')]

	rows.forEach(r => {
		const date = new Date(r.created_at).toLocaleString('pt-BR')
		const cols = [
			r.banco || '',
			date || '',
			r.nome || '',
			r.cpf || '',
			r.tipo || '',
			// Remove quebras de linha do motivo para não quebrar o CSV
			(r.motivo || '').replace(/[\r\n]+/g, ' '),
			r.arquivo_url || 'Sem anexo',
		]

		// Adiciona aspas em cada valor para evitar problemas com caracteres especiais
		linhas.push(cols.map(v => `"${String(v).replace(/"/g, '""')}"`).join(';'))
	})

	// Cria o arquivo e dispara o download
	const csv = linhas.join('\n')
	const blob = new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8;' }) // \ufeff ajuda o Excel com acentos
	const url = URL.createObjectURL(blob)

	const a = document.createElement('a')
	const ts = new Date().toISOString().slice(0, 10) // Data atual para o nome do arquivo

	a.href = url
	a.download = `relatorio_acertos_${ts}.csv`
	document.body.appendChild(a)
	a.click()
	document.body.removeChild(a)
	URL.revokeObjectURL(url)

	showMsg('CSV gerado com sucesso!')
}
