import { createClient } from '@supabase/supabase-js'

export const supabaseClient = createClient(
	import.meta.env.VITE_SUPABASE_URL,
	import.meta.env.VITE_SUPABASE_KEY
)

export const AUTH_USER = import.meta.env.VITE_AUTH_USER
export const AUTH_PASS = import.meta.env.VITE_AUTH_PASS

export const BANKS = [
	'CREFAZ',
	'DI+',
	'DSV',
	'GRANA PIX',
	'Grandino Bank',
	'HUB',
	'LOTUS MAIS',
	'NOVO SAQUE',
	'PRATA',
	'PRESENCA BANK',
	'QUALI BANKING',
	'TOP MAIS TOP',
	'UNNO',
	'V8',
	'VCTEX',
]
