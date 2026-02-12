import { AUTH_PASS, AUTH_USER, BANKS, supabaseClient } from './config.js'

const $ = id => document.getElementById(id)

// --- UTILITÁRIOS ---
const toggleLoading = s => {
	if ($('loadingOverlay')) $('loadingOverlay').style.display = s ? 'flex' : 'none'
}
const showMsg = (t, tp = 'success') => {
	const c = $('toastContainer')
	if (!c) return
	const ts = document.createElement('div')
	ts.className = `toast ${tp}`
	ts.innerHTML = `<span>${tp === 'success' ? '✅' : '❌'}</span> <span>${t}</span>`
	c.appendChild(ts)
	setTimeout(() => {
		ts.classList.add('fade-out')
		setTimeout(() => ts.remove(), 300)
	}, 4000)
}
const onlyDigits = s => (s || '').replace(/\D+/g, '')
const formatCPF = r => {
	const d = onlyDigits(r)
	return d.length === 11 ? `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}` : r
}
function isCPFValido(c) {
	c = onlyDigits(c)
	if (c.length !== 11 || !!c.match(/(\d)\1{10}/)) return false
	const v = c.split('').map(d => +d)
	const a = v.slice(0, 9).reduce((s, d, i) => s + d * (10 - i), 0),
		b = v.slice(0, 10).reduce((s, d, i) => s + d * (11 - i), 0)
	return !(((a * 10) % 11) % 10 !== v[9] || ((b * 10) % 11) % 10 !== v[10])
}
const aplicarMascaraCPF = e => {
	let v = e.target.value.replace(/\D/g, '').slice(0, 11)
	if (v.length > 9) v = v.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
	else if (v.length > 6) v = v.replace(/(\d{3})(\d{3})(\d+)/, '$1.$2.$3')
	else if (v.length > 3) v = v.replace(/(\d{3})(\d+)/, '$1.$2')
	e.target.value = v
}

// --- ESTADO GLOBAL ---
let lastTodos = [],
	lastBusca = []

window.onload = async () => {
	if (sessionStorage.getItem('admin') === 'true') $('btnLogout').style.display = 'inline-flex'
	fillBanks()
	setupTabs()
	setupEventListeners()
	selecionarSubAbaTodos()
	toggleLoading(true)
	await Promise.all([refreshData(), renderFrases()])
	toggleLoading(false)
}

// --- NAVEGAÇÃO ---
function switchTab(id) {
	document.querySelectorAll('.tab, [data-main]').forEach(el => el.classList.remove('active'))
	if ($(id)) $(id).classList.add('active')
	const b = document.querySelector(`[data-main="${id}"]`)
	if (b) b.classList.add('active')
}
function selecionarSubAbaTodos() {
	document
		.querySelectorAll('#mainConsulta .tab, [data-consulta]')
		.forEach(el => el.classList.remove('active'))
	$('cTodos').classList.add('active')
	const b = document.querySelector('[data-consulta="cTodos"]')
	if (b) b.classList.add('active')
}
function selecionarSubAbaCadastrar() {
	document
		.querySelectorAll('#mainAdmin .tab, [data-admin]')
		.forEach(el => el.classList.remove('active'))
	$('aCadastrar').classList.add('active')
	const b = document.querySelector('[data-admin="aCadastrar"]')
	if (b) b.classList.add('active')
}

function setupTabs() {
	document.querySelectorAll('[data-main]').forEach(btn => {
		btn.onclick = () => {
			const t = btn.dataset.main
			if (t === 'mainAdmin' && !sessionStorage.getItem('admin'))
				$('loginBack').style.display = 'flex'
			else {
				switchTab(t)
				if (t === 'mainConsulta') {
					selecionarSubAbaTodos()
					refreshData()
				}
				if (t === 'mainAdmin') selecionarSubAbaCadastrar()
			}
		}
	})
	document.querySelectorAll('[data-admin]').forEach(btn => {
		btn.onclick = () => {
			const t = btn.dataset.admin
			document
				.querySelectorAll('#mainAdmin .tab, [data-admin]')
				.forEach(el => el.classList.remove('active'))
			if ($(t)) $(t).classList.add('active')
			btn.classList.add('active')
			if (t === 'aReclamacoes') renderReclamacoes()
			if (t === 'aAnalise') renderAnalise()
			if (t === 'aFrases') renderFrases()
			if (t === 'aHistorico') renderHistoricoAdmin()
			if (t === 'aVendedores') renderBaseVendedores()
		}
	})
	document.querySelectorAll('[data-consulta]').forEach(btn => {
		btn.onclick = () => {
			const t = btn.dataset.consulta
			document
				.querySelectorAll('#mainConsulta .tab, [data-consulta]')
				.forEach(el => el.classList.remove('active'))
			$(t).classList.add('active')
			btn.classList.add('active')
			if (t === 'cTodos') refreshData()
		}
	})
}

// --- EVENTOS ---
function setupEventListeners() {
	$('btnEntrar').onclick = () => {
		if ($('loginUser').value === AUTH_USER && $('loginPass').value === AUTH_PASS) {
			sessionStorage.setItem('admin', 'true')
			$('loginBack').style.display = 'none'
			$('btnLogout').style.display = 'inline-flex'
			switchTab('mainAdmin')
			selecionarSubAbaCadastrar()
		} else showMsg('Acesso negado!', 'error')
	}
	$('btnCancelLogin').onclick = () => ($('loginBack').style.display = 'none')
	if ($('btnLimparBusca'))
		$('btnLimparBusca').onclick = () => {
			$('q').value = ''
			$('tbodyBusca').innerHTML = ''
			refreshData()
		}

	$('btnSalvar').onclick = addRegistro
	$('btnLimpar').onclick = clearFields
	$('btnLimparRec').onclick = clearRecForm
	$('btnCarregarBase').onclick = () => $('bases').click()
	$('bases').onchange = e => loadBasesToCloud(e.target.files)
	$('btnLimparBase').onclick = clearBaseFromCloud
	$('btnModeloBase').onclick = downloadModeloBase

	$('cpf').oninput = e => {
		aplicarMascaraCPF(e)
		tryAutoFillCloud(e.target.value, 'nome')
	}
	$('recCpf').oninput = e => {
		aplicarMascaraCPF(e)
		tryAutoFillCloud(e.target.value, 'recNome')
	}
	$('q').oninput = e => {
		if (/\d/.test(e.target.value)) aplicarMascaraCPF(e)
	}

	$('btnRecarregar').onclick = refreshData
	$('btnBuscar').onclick = buscarRegistros
	$('fBancoConsulta').onchange = refreshData
	$('btnSalvarFrase').onclick = salvarFrasePadrao
	$('btnSalvarRec').onclick = addReclamacao
	$('btnExportarConsulta').onclick = exportarCSV
	$('btnExportarAnalise').onclick = exportarAnaliseCSV
	$('btnLogout').onclick = () => {
		if (confirm('Deseja realmente sair?')) {
			localStorage.clear()
			sessionStorage.clear()
			window.location.reload()
		}
	}
}

// --- BASE VENDEDORES ---
async function renderBaseVendedores() {
	const tbody = $('tbodyBaseVendedores')
	if (!tbody) return
	toggleLoading(true)
	const { data } = await supabaseClient
		.from('base_vendedores')
		.select('*')
		.order('nome', { ascending: true })

	if (!data || data.length === 0) {
		tbody.innerHTML = `
				<tr>
					<td colspan="3" style="text-align: center; padding: 20px; color: var(--text-muted);">
						👥  Ninguém cadastrado na base de vendedores.
					</td>
				</tr>`
		toggleLoading(false)
		return
	}

	tbody.innerHTML = (data || [])
		.map(
			v =>
				`<tr><td class="mono">${formatCPF(v.cpf)}</td><td>${v.nome}</td><td><button class="btn-del" onclick="window.excluirVendedor('${v.cpf}')">🗑️</button></td></tr>`
		)
		.join('')
	toggleLoading(false)
}
window.excluirVendedor = async cpf => {
	if (!confirm('Excluir vendedor da base?')) return
	await supabaseClient.from('base_vendedores').delete().eq('cpf', cpf)
	renderBaseVendedores()
}
async function loadBasesToCloud(files) {
	toggleLoading(true)
	const allRows = []
	for (const f of files) {
		const reader = new FileReader()
		const d = await new Promise(res => {
			reader.onload = e =>
				res(
					XLSX.utils.sheet_to_json(
						XLSX.read(e.target.result, { type: 'binary' }).Sheets[
							XLSX.read(e.target.result, { type: 'binary' }).SheetNames[0]
						]
					)
				)
			reader.readAsBinaryString(f)
		})
		allRows.push(...d)
	}
	const formatted = allRows
		.map(r => ({
			cpf: onlyDigits(String(r.cpf || r.CPF || '')),
			nome: String(r.nome || r.Nome || '').trim(),
		}))
		.filter(x => x.cpf.length === 11 && x.nome !== '')
	await supabaseClient.from('base_vendedores').upsert(formatted, { onConflict: 'cpf' })
	showMsg('Base atualizada!')
	renderBaseVendedores()
	toggleLoading(false)
}
async function tryAutoFillCloud(val, targetId) {
	const cpf = onlyDigits(val)
	if (cpf.length === 11) {
		const { data } = await supabaseClient
			.from('base_vendedores')
			.select('nome')
			.eq('cpf', cpf)
			.single()
		if (data && !$(targetId).value) {
			$(targetId).value = data.nome
			showMsg('Vendedor identificado!')
		}
	}
}
async function clearBaseFromCloud() {
	if (confirm('APAGAR TUDO?')) {
		await supabaseClient.from('base_vendedores').delete().neq('cpf', '0')
		renderBaseVendedores()
	}
}
function downloadModeloBase() {
	const csv = '\ufeffCPF;Nome\n12345678901;Fulano de Tal'
	const b = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
	const a = document.createElement('a')
	a.href = URL.createObjectURL(b)
	a.download = 'modelo.csv'
	a.click()
}

// --- REGISTROS E CONSULTA ---
async function addRegistro() {
	const cpfRaw = $('cpf').value
	if (!isCPFValido(cpfRaw)) return showMsg('CPF inválido!', 'error')
	const file = $('arquivoInput').files[0],
		motivoFinal = [$('motivoPadrao').value, $('motivo').value.trim()].filter(Boolean).join(' - ')
	if (!$('nome').value || !motivoFinal) return showMsg('Campos vazios!', 'error')
	toggleLoading(true)
	let url = null
	if (file) {
		const fName = `${Date.now()}_${file.name}`
		await supabaseClient.storage.from('anexos').upload(`uploads/${fName}`, file)
		url = supabaseClient.storage.from('anexos').getPublicUrl(`uploads/${fName}`).data.publicUrl
	}
	await supabaseClient.from('registros').insert([
		{
			banco: $('banco').value,
			nome: $('nome').value,
			cpf: onlyDigits(cpfRaw),
			tipo: $('tipo').value,
			motivo: motivoFinal,
			arquivo_url: url,
		},
	])
	showMsg('Salvo!')
	clearFields()
	refreshData()
	toggleLoading(false)
}
async function refreshData() {
	const b = $('fBancoConsulta').value,
		tbody = $('tbodyTodos')
	if (tbody) tbody.innerHTML = '<tr><td colspan="8">...</td></tr>'
	let q = supabaseClient.from('registros').select('*').order('created_at', { ascending: false })
	if (b) q = q.eq('banco', b)
	const { data } = await q
	lastTodos = data || []
	renderRows(lastTodos, 'tbodyTodos')
}
async function buscarRegistros() {
	const busca = $('q').value.trim()
	if (!busca) return
	toggleLoading(true)
	const term = onlyDigits(busca) || busca
	const q = supabaseClient
		.from('registros')
		.select('*')
		.order('created_at', { ascending: false })
		.or(`nome.ilike.%${busca}%,cpf.ilike.%${term}%`)
	const { data } = await q
	lastBusca = data || []
	renderRows(lastBusca, 'tbodyBusca')
	document
		.querySelectorAll('#mainConsulta .tab, [data-consulta]')
		.forEach(el => el.classList.remove('active'))
	$('cBuscar').classList.add('active')
	document.querySelector('[data-consulta="cBuscar"]').classList.add('active')
	toggleLoading(false)
}
function renderRows(rows, targetId) {
	const tbody = $(targetId)
	if (!tbody) return

	if (!rows || rows.length === 0) {
		tbody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align: center; padding: 30px; color: var(--text-muted); font-style: italic;">
                    🚫 Nenhum registro encontrado.
                </td>
            </tr>`
		return
	}

	tbody.innerHTML = rows
		.map(r => {
			const anexo = r.arquivo_url ? `<a href="${r.arquivo_url}" target="_blank">📎 Ver</a>` : '---'
			const del =
				sessionStorage.getItem('admin') === 'true'
					? `<button onclick="window.confirmarExclusao('${r.id}', '${r.arquivo_url}')" class="btn-del">🗑️</button>`
					: '---'
			const badgeClass =
				r.tipo === 'BLOQUEIO'
					? 'badge bloqueio'
					: r.tipo === 'INATIVACAO'
						? 'badge inativacao'
						: 'badge'
			return `<tr><td>${r.banco}</td><td>${new Date(r.created_at).toLocaleString('pt-BR')}</td><td>${r.nome}</td><td class="mono">${formatCPF(r.cpf)}</td><td><span class="${badgeClass}">${r.tipo}</span></td><td>${r.motivo}</td><td style="text-align:center;">${anexo}</td><td style="text-align:center;">${del}</td></tr>`
		})
		.join('')
}
function exportarCSV() {
	const rows = $('cBuscar').classList.contains('active') ? lastBusca : lastTodos
	if (!rows.length) return
	const head = ['Banco', 'Data', 'Nome', 'CPF', 'Tipo', 'Motivo', 'Link']
	const csv = [
		head.join(';'),
		...rows.map(r =>
			[
				r.banco,
				new Date(r.created_at).toLocaleString('pt-BR'),
				r.nome,
				formatCPF(r.cpf),
				r.tipo,
				r.motivo.replace(/;/g, ','),
				r.arquivo_url || '',
			].join(';')
		),
	].join('\n')
	const b = new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8;' })
	const a = document.createElement('a')
	a.href = URL.createObjectURL(b)
	a.download = 'relatorio.csv'
	a.click()
}

// --- RECLAMAÇÕES E ANÁLISE ---
async function addReclamacao() {
	const item = {
		banco: $('recBanco').value,
		nome: $('recNome').value.trim(),
		cpf: onlyDigits($('recCpf').value),
		desc_reclamacao: $('recDesc').value.trim(),
	}
	if (!item.banco || !item.cpf || !item.desc_reclamacao || !isCPFValido(item.cpf))
		return showMsg('Dados inválidos', 'error')
	toggleLoading(true)
	await supabaseClient.from('reclamacoes').insert([item])
	clearRecForm()
	renderReclamacoes()
	renderAnalise()
	toggleLoading(false)
}
async function renderReclamacoes() {
	const b = $('fBancoRec').value,
		busca = $('buscaRec').value.trim()
	let q = supabaseClient.from('reclamacoes').select('*').order('created_at', { ascending: false })
	if (b) q = q.eq('banco', b)
	if (busca) q = q.or(`nome.ilike.%${busca}%,cpf.ilike.%${onlyDigits(busca)}%`)
	const { data } = await q

	if (!data || data.length === 0) {
		$('tbodyRec').innerHTML = `
				<tr>
					<td colspan="8" style="text-align: center; padding: 30px; color: var(--text-muted);">
						📣 A lista de reclamações está vazia.
					</td>
				</tr>`
		return
	}
	$('tbodyRec').innerHTML = (data || [])
		.map(
			r =>
				`<tr><td>${r.banco}</td><td class="mono">${new Date(r.created_at).toLocaleString('pt-BR')}</td><td>${r.nome}</td><td class="mono">${formatCPF(r.cpf)}</td><td>${r.desc_reclamacao}</td><td><button class="btn-del" onclick="window.deleteReclamacao('${r.id}')">🗑️</button></td></tr>`
		)
		.join('')
}
async function renderAnalise() {
	const { data } = await supabaseClient.from('reclamacoes').select('*')
	const map = new Map()
	data.forEach(r => {
		const cur = map.get(r.cpf) || { nome: r.nome, total: 0, cpf: r.cpf }
		cur.total++
		map.set(r.cpf, cur)
	})
	const groups = Array.from(map.values()).sort((a, b) => b.total - a.total)
	$('tbodyAnalise').innerHTML = groups
		.map(
			g =>
				`<tr><td><b>${g.nome}</b></td><td class="mono">${formatCPF(g.cpf)}</td><td><b>${g.total}</b></td><td><span class="badge">${g.total >= 3 ? '⛔ Crítico' : 'OK'}</span></td><td><button class="primary" onclick="window.renderDetalhes('${g.cpf}')">Ver</button></td></tr>`
		)
		.join('')
	if ($('alertSugerido'))
		$('alertSugerido').style.display = groups.some(g => g.total >= 3) ? 'block' : 'none'
}
function exportarAnaliseCSV() {
	const head = ['Vendedor', 'CPF', 'Total', 'Status']
	const rows = Array.from($('tbodyAnalise').querySelectorAll('tr'))
	const csv = [
		head.join(';'),
		...rows.map(tr =>
			Array.from(tr.querySelectorAll('td'))
				.slice(0, 4)
				.map(td => td.innerText)
				.join(';')
		),
	].join('\n')
	const b = new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8;' })
	const a = document.createElement('a')
	a.href = URL.createObjectURL(b)
	a.download = 'analise.csv'
	a.click()
}
window.renderDetalhes = async cpf => {
	const { data } = await supabaseClient
		.from('reclamacoes')
		.select('*')
		.eq('cpf', cpf)
		.order('created_at', { ascending: false })
	$('tbodyDet').innerHTML = data
		.map(
			r =>
				`<tr><td>${r.banco}</td><td class="mono">${new Date(r.created_at).toLocaleString('pt-BR')}</td><td>${r.desc_reclamacao}</td></tr>`
		)
		.join('')
	if ($('detPanel')) {
		$('detPanel').innerHTML = `
			<div class="kv">
				<b>CPF:</b>
				<span class="mono">${formatCPF(cpf)}</span>
			</div>
			<div class="kv">
				<b>Total:</b>
				<span><b>${data.length}</b> reclamações</span>
			</div>
		`
	}
}

// --- HISTÓRICO E FRASES ---
async function renderHistoricoAdmin() {
	const { data } = await supabaseClient
		.from('registros')
		.select('*')
		.order('created_at', { ascending: false })

	if (!data || data.length === 0) {
		$('tbodyHistorico').innerHTML = `
				<tr>
					<td colspan="8" style="text-align: center; padding: 30px; color: var(--text-muted);">
						📭 O histórico de cadastros está vazio.
					</td>
				</tr>`
		return
	}
	$('tbodyHistorico').innerHTML = (data || [])
		.map(r => {
			const badgeClass =
				r.tipo === 'BLOQUEIO'
					? 'badge bloqueio'
					: r.tipo === 'INATIVACAO'
						? 'badge inativacao'
						: 'badge'
			return `<tr><td>${r.banco}</td><td class="mono">${new Date(r.created_at).toLocaleString('pt-BR')}</td><td>${r.nome}</td><td class="mono">${formatCPF(r.cpf)}</td><td><span class="${badgeClass}">${r.tipo}</span></td><td>${r.motivo}</td><td>${r.arquivo_url ? '📎' : ''}</td><td><button onclick="window.confirmarExclusao('${r.id}', '${r.arquivo_url}')" class="btn-del">🗑️</button></td></tr>`
		})
		.join('')
}
async function renderFrases() {
	const { data } = await supabaseClient
		.from('motivos_padrao')
		.select('*')
		.order('texto', { ascending: true })
	$('motivoPadrao').innerHTML =
		'<option value="">— Selecione —</option>' +
		data.map(m => `<option value="${m.texto}">${m.texto}</option>`).join('')
	$('listaFrases').innerHTML = data
		.map(
			m =>
				`<div class="row" style="padding:10px; border-bottom:1px solid rgba(255,255,255,0.1);"><span class="spacer">${m.texto}</span><button class="btn-del" onclick="window.excluirFrase('${m.id}')">🗑️</button></div>`
		)
		.join('')
}
async function salvarFrasePadrao() {
	if ($('motivoNovo').value.trim()) {
		await supabaseClient.from('motivos_padrao').insert([{ texto: $('motivoNovo').value.trim() }])
		$('motivoNovo').value = ''
		renderFrases()
	}
}

// --- TAREFAS GLOBAIS ---
window.confirmarExclusao = async (id, url) => {
	if (!confirm('Excluir?')) return
	toggleLoading(true)
	if (url) await supabaseClient.storage.from('anexos').remove([`uploads/${url.split('/').pop()}`])
	await supabaseClient.from('registros').delete().eq('id', id)
	refreshData()
	renderHistoricoAdmin()
	toggleLoading(false)
}
window.deleteReclamacao = async id => {
	if (confirm('Excluir?')) {
		await supabaseClient.from('reclamacoes').delete().eq('id', id)
		renderReclamacoes()
		renderAnalise()
	}
}
window.excluirFrase = async id => {
	await supabaseClient.from('motivos_padrao').delete().eq('id', id)
	renderFrases()
}
function clearFields() {
	;['nome', 'cpf', 'motivo', 'arquivoInput'].forEach(id => ($(id).value = ''))
	$('motivoPadrao').value = ''
}
function clearRecForm() {
	;['recCpf', 'recNome', 'recDesc'].forEach(id => ($(id).value = ''))
}
function fillBanks() {
	;['fBancoConsulta', 'banco', 'recBanco', 'fBancoRec', 'fBancoAnalise'].forEach(id => {
		const s = $(id)
		if (!s) return
		s.innerHTML = id.startsWith('f') ? '<option value="">Todos</option>' : ''
		BANKS.forEach(b => (s.innerHTML += `<option value="${b}">${b}</option>`))
	})
}
