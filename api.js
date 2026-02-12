import { supabaseClient } from './config.js'

export async function getRegistros(banco = '') {
	let query = supabaseClient.from('registros').select('*').order('created_at', { ascending: false })
	if (banco) query = query.eq('banco', banco)
	return await query
}

export async function searchRegistros(banco, term) {
	let query = supabaseClient.from('registros').select('*').order('created_at', { ascending: false })
	if (banco) query = query.eq('banco', banco)
	const cleanTerm = term.replace(/\D/g, '') || term
	return await query.or(`nome.ilike.%${term}%,cpf.ilike.%${cleanTerm}%`)
}

export async function uploadFile(file) {
	const fileName = `${Date.now()}_${file.name}`
	const filePath = `uploads/${fileName}`
	const { error } = await supabaseClient.storage.from('anexos').upload(filePath, file)
	if (error) throw error
	const { data } = supabaseClient.storage.from('anexos').getPublicUrl(filePath)
	return data.publicUrl
}
