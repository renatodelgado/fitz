import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  Camera,
  CalendarDays,
  ChartNoAxesCombined,
  ChevronDown,
  ChevronUp,
  CircleGauge,
  Flame,
  ImagePlus,
  LoaderCircle,
  Plus,
  ScanBarcode,
  Search,
  Settings2,
  Sparkles,
  Trash2,
  Utensils,
  X
} from 'lucide-react'
import { createCustomFood, createFoodEntry } from './storage'
import {
  getOpenFoodFactsProduct,
  normalizeSearch,
  searchTaco,
  searchUsda
} from './foodData'
import { getDiaryAverage, getWeightProjection } from './predictions'

const PERIODS = [
  { id: 'morning', label: 'Manhã', hint: 'Café da manhã e lanches' },
  { id: 'afternoon', label: 'Tarde', hint: 'Almoço e lanches' },
  { id: 'evening', label: 'Noite', hint: 'Jantar e ceia' }
]

const EMPTY_DAY = { morning: [], afternoon: [], evening: [] }
const EMPTY_CUSTOM = {
  name: '',
  servingGrams: 100,
  calories: '',
  protein: '',
  carbs: '',
  fat: '',
  barcode: ''
}

function localDateKey(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function parseLocalDate(value) {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day)
}

function moveDate(value, amount) {
  const date = parseLocalDate(value)
  date.setDate(date.getDate() + amount)
  return localDateKey(date)
}

function formatDay(value) {
  const date = parseLocalDate(value)
  const today = localDateKey()
  if (value === today) return 'Hoje'
  if (value === moveDate(today, -1)) return 'Ontem'
  if (value === moveDate(today, 1)) return 'Amanhã'
  return new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long'
  }).format(date)
}

function number(value, digits = 0) {
  return new Intl.NumberFormat('pt-BR', {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits
  }).format(Number(value) || 0)
}

function dayTotals(day) {
  return Object.values(day)
    .flat()
    .reduce((totals, entry) => ({
      calories: totals.calories + Number(entry.calories || 0),
      protein: totals.protein + Number(entry.protein || 0),
      carbs: totals.carbs + Number(entry.carbs || 0),
      fat: totals.fat + Number(entry.fat || 0)
    }), { calories: 0, protein: 0, carbs: 0, fat: 0 })
}

function Modal({ title, children, onClose, wide = false }) {
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className={`modal-card ${wide ? 'modal-wide' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="modal-heading">
          <h2>{title}</h2>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Fechar"><X /></button>
        </div>
        {children}
      </section>
    </div>
  )
}

function FoodResult({ food, onSelect }) {
  return (
    <button className="food-result" type="button" onClick={() => onSelect(food)}>
      <span>
        <strong>{food.name}</strong>
        <small>{food.brand ? `${food.brand} · ` : ''}{food.source} · valores por {food.servingGrams || 100} g</small>
      </span>
      <span className="food-result-macros">
        <b>{number(food.calories)} kcal</b>
        <small>P {number(food.protein, 1)} · C {number(food.carbs, 1)} · G {number(food.fat, 1)}</small>
      </span>
      <Plus size={18} />
    </button>
  )
}

function BarcodeScanner({ onResult, onClose }) {
  const videoRef = useRef(null)
  const controlsRef = useRef(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let mounted = true

    async function start() {
      try {
        const { BrowserMultiFormatReader } = await import('@zxing/browser')
        const reader = new BrowserMultiFormatReader()
        controlsRef.current = await reader.decodeFromVideoDevice(
          undefined,
          videoRef.current,
          (result) => {
            if (result && mounted) {
              controlsRef.current?.stop()
              onResult(result.getText())
            }
          }
        )
      } catch {
        if (mounted) setError('Não foi possível acessar a câmera. Verifique a permissão do navegador.')
      }
    }

    start()
    return () => {
      mounted = false
      controlsRef.current?.stop()
    }
  }, [onResult])

  return (
    <Modal title="Ler código de barras" onClose={onClose}>
      <div className="scanner-frame">
        <video ref={videoRef} muted playsInline />
        <span className="scanner-line" />
      </div>
      <p className="modal-help">Aponte a câmera para um código EAN ou UPC do produto.</p>
      {error && <p className="form-error">{error}</p>}
    </Modal>
  )
}

function FoodPicker({ profile, period, onAdd, onSaveProfile, onClose }) {
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(null)
  const [grams, setGrams] = useState(100)
  const [remoteFoods, setRemoteFoods] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [scannerOpen, setScannerOpen] = useState(false)
  const [customOpen, setCustomOpen] = useState(false)
  const [pendingBarcode, setPendingBarcode] = useState('')
  const [settingsOpen, setSettingsOpen] = useState(false)

  const localFoods = useMemo(() => {
    const normalized = normalizeSearch(query)
    const custom = (profile.customFoods ?? []).filter((food) => (
      normalizeSearch(food.name).includes(normalized)
    ))
    return normalized.length >= 2 ? [...custom, ...searchTaco(query)] : custom.slice(0, 12)
  }, [profile.customFoods, query])

  const lookupUsda = async () => {
    if (query.trim().length < 2) return
    setLoading(true)
    setError('')
    try {
      setRemoteFoods(await searchUsda(query, profile.settings?.usdaApiKey))
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setLoading(false)
    }
  }

  const lookupBarcode = async (barcode) => {
    setScannerOpen(false)
    setPendingBarcode(barcode)
    setLoading(true)
    setError('')
    try {
      setSelected(await getOpenFoodFactsProduct(barcode))
      setGrams(100)
    } catch (requestError) {
      setError(requestError.message)
      setCustomOpen(true)
    } finally {
      setLoading(false)
    }
  }

  const submit = () => {
    if (!selected || Number(grams) <= 0) return
    onAdd(createFoodEntry(selected, grams, period))
    onClose()
  }

  return (
    <>
      <Modal title={`Adicionar em ${PERIODS.find((item) => item.id === period)?.label}`} onClose={onClose} wide>
        <div className="food-picker-tools">
          <label className="search-field">
            <Search />
            <input
              autoFocus
              value={query}
              onChange={(event) => { setQuery(event.target.value); setRemoteFoods([]) }}
              placeholder="Busque arroz, feijão, ovo..."
            />
          </label>
          <button className="button button-secondary compact-button" type="button" onClick={() => setScannerOpen(true)}>
            <ScanBarcode size={18} /> Código de barras
          </button>
          <button className="button button-secondary compact-button" type="button" onClick={() => setCustomOpen(true)}>
            <ImagePlus size={18} /> Cadastrar / OCR
          </button>
        </div>

        {selected ? (
          <div className="selected-food">
            <button className="text-button" type="button" onClick={() => setSelected(null)}><ArrowLeft /> Voltar à busca</button>
            <div className="selected-food-card">
              <div><span className="source-pill">{selected.source}</span><h3>{selected.name}</h3><p>Valores nutricionais informados por {selected.servingGrams || 100} g.</p></div>
              <label className="grams-field"><span>Quantidade consumida</span><div><input type="number" min="1" value={grams} onChange={(event) => setGrams(event.target.value)} /><b>g</b></div></label>
            </div>
            <button className="button button-primary full-button" type="button" disabled={Number(grams) <= 0} onClick={submit}>
              <Plus /> Adicionar ao diário
            </button>
          </div>
        ) : (
          <>
            <div className="food-results">
              {localFoods.map((food) => <FoodResult key={food.id} food={food} onSelect={setSelected} />)}
              {remoteFoods.map((food) => <FoodResult key={food.id} food={food} onSelect={setSelected} />)}
              {query.length >= 2 && !localFoods.length && !remoteFoods.length && !loading && (
                <div className="empty-food-search"><Search /><strong>Nada na TACO ou nos seus alimentos</strong><span>Consulte a base USDA ou cadastre este alimento.</span></div>
              )}
            </div>
            {query.length >= 2 && (
              <div className="fallback-row">
                <button className="button button-secondary" type="button" onClick={lookupUsda} disabled={loading}>
                  {loading ? <LoaderCircle className="spin" /> : <Sparkles />} Buscar também no USDA
                </button>
                <button className="text-button" type="button" onClick={() => setSettingsOpen((value) => !value)}><Settings2 /> Chave da API</button>
              </div>
            )}
            {settingsOpen && (
              <label className="api-key-field">
                <span>USDA API key <small>(sem chave, usa DEMO_KEY com limite reduzido)</small></span>
                <input
                  value={profile.settings?.usdaApiKey ?? ''}
                  onChange={(event) => onSaveProfile({
                    ...profile,
                    settings: { ...profile.settings, usdaApiKey: event.target.value.trim() }
                  })}
                  placeholder="Cole sua chave data.gov"
                />
              </label>
            )}
            {error && <p className="form-error">{error}</p>}
          </>
        )}
      </Modal>
      {scannerOpen && <BarcodeScanner onResult={lookupBarcode} onClose={() => setScannerOpen(false)} />}
      {customOpen && (
        <CustomFoodForm
          initialBarcode={pendingBarcode}
          onClose={() => setCustomOpen(false)}
          onSave={(food) => {
            onSaveProfile({ ...profile, customFoods: [...(profile.customFoods ?? []), food] })
            setSelected(food)
            setCustomOpen(false)
          }}
        />
      )}
    </>
  )
}

function extractNutrition(text) {
  const normalized = text.replace(/,/g, '.')
  const valueAfter = (labels) => {
    const pattern = new RegExp(`(?:${labels})[^\\d]{0,28}(\\d+(?:\\.\\d+)?)`, 'i')
    return normalized.match(pattern)?.[1] ?? ''
  }
  return {
    calories: valueAfter('valor energético|energia|calorias|kcal'),
    protein: valueAfter('proteínas?|protein'),
    carbs: valueAfter('carboidratos?|carbohydrate'),
    fat: valueAfter('gorduras? totais|lipídios?|fat')
  }
}

function CustomFoodForm({ initialBarcode, onSave, onClose }) {
  const [values, setValues] = useState({ ...EMPTY_CUSTOM, barcode: initialBarcode })
  const [ocrStatus, setOcrStatus] = useState('')
  const update = (key, value) => setValues((current) => ({ ...current, [key]: value }))

  const readLabel = async (file) => {
    if (!file) return
    setOcrStatus('Lendo o rótulo. Isso pode levar alguns segundos...')
    try {
      const { createWorker } = await import('tesseract.js')
      const worker = await createWorker('por')
      const result = await worker.recognize(file)
      await worker.terminate()
      const nutrition = extractNutrition(result.data.text)
      setValues((current) => ({ ...current, ...nutrition }))
      setOcrStatus('Rótulo lido. Confira os valores antes de salvar.')
    } catch {
      setOcrStatus('Não foi possível ler a imagem. Você ainda pode preencher os campos manualmente.')
    }
  }

  return (
    <Modal title="Cadastrar alimento local" onClose={onClose}>
      <label className="ocr-drop">
        <Camera />
        <strong>Fotografar ou enviar rótulo</strong>
        <span>O OCR tenta preencher calorias e macronutrientes.</span>
        <input type="file" accept="image/*" capture="environment" onChange={(event) => readLabel(event.target.files?.[0])} />
      </label>
      {ocrStatus && <p className="ocr-status">{ocrStatus}</p>}
      <div className="custom-food-form">
        <label className="full-field"><span>Nome</span><input value={values.name} onChange={(event) => update('name', event.target.value)} placeholder="Ex.: Granola da casa" /></label>
        <label><span>Porção de referência</span><div className="unit-input"><input type="number" value={values.servingGrams} onChange={(event) => update('servingGrams', event.target.value)} /><b>g</b></div></label>
        <label><span>Calorias</span><div className="unit-input"><input type="number" value={values.calories} onChange={(event) => update('calories', event.target.value)} /><b>kcal</b></div></label>
        <label><span>Proteínas</span><div className="unit-input"><input type="number" value={values.protein} onChange={(event) => update('protein', event.target.value)} /><b>g</b></div></label>
        <label><span>Carboidratos</span><div className="unit-input"><input type="number" value={values.carbs} onChange={(event) => update('carbs', event.target.value)} /><b>g</b></div></label>
        <label><span>Gorduras</span><div className="unit-input"><input type="number" value={values.fat} onChange={(event) => update('fat', event.target.value)} /><b>g</b></div></label>
        <label className="full-field"><span>Código de barras (opcional)</span><input inputMode="numeric" value={values.barcode} onChange={(event) => update('barcode', event.target.value)} /></label>
      </div>
      <button className="button button-primary full-button" type="button" disabled={!values.name.trim()} onClick={() => onSave(createCustomFood(values))}>Salvar alimento</button>
    </Modal>
  )
}

export function FoodDiaryView({ profile, onSaveProfile }) {
  const [date, setDate] = useState(localDateKey)
  const [pickerPeriod, setPickerPeriod] = useState(null)
  const [collapsed, setCollapsed] = useState({})
  const day = { ...EMPTY_DAY, ...(profile.foodDiary?.[date] ?? {}) }
  const totals = dayTotals(day)
  const latestGoal = profile.records?.at(-1)?.calories
  const progress = latestGoal ? Math.min(100, (totals.calories / latestGoal) * 100) : 0

  const saveDay = (nextDay) => onSaveProfile({
    ...profile,
    foodDiary: { ...(profile.foodDiary ?? {}), [date]: nextDay }
  })

  const addEntry = (entry) => {
    saveDay({ ...day, [entry.period]: [...day[entry.period], entry] })
  }

  const removeEntry = (period, entryId) => {
    saveDay({ ...day, [period]: day[period].filter((entry) => entry.id !== entryId) })
  }

  return (
    <div className="nutrition-page">
      <div className="nutrition-heading">
        <div className="page-heading">
          <p className="eyebrow"><Utensils size={15} /> Diário de {profile.name}</p>
          <h1>Alimentação do dia</h1>
          <p>Registre as refeições e acompanhe calorias e macronutrientes.</p>
        </div>
        <div className="date-switcher">
          <button className="icon-button" onClick={() => setDate(moveDate(date, -1))} aria-label="Dia anterior"><ArrowLeft /></button>
          <label><CalendarDays /><span><strong>{formatDay(date)}</strong><small>{new Intl.DateTimeFormat('pt-BR').format(parseLocalDate(date))}</small></span><input type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label>
          <button className="icon-button" onClick={() => setDate(moveDate(date, 1))} aria-label="Próximo dia"><ArrowRight /></button>
        </div>
      </div>

      <section className="daily-summary">
        <div className="calorie-progress" style={{ '--progress': `${progress * 3.6}deg` }}>
          <div><Flame /><strong>{number(totals.calories)}</strong><span>kcal consumidas</span></div>
        </div>
        <div className="daily-goal">
          <span>Meta da avaliação mais recente</span>
          <strong>{latestGoal ? `${number(latestGoal)} kcal` : 'Ainda sem meta'}</strong>
          <div className="goal-track"><i style={{ width: `${progress}%` }} /></div>
          <small>{latestGoal ? `${number(Math.max(0, latestGoal - totals.calories))} kcal restantes` : 'Conclua uma avaliação para comparar o consumo.'}</small>
        </div>
        <div className="macro-summary">
          <span><i className="macro-dot carbs" /><small>Carboidratos</small><strong>{number(totals.carbs)} g</strong></span>
          <span><i className="macro-dot protein" /><small>Proteínas</small><strong>{number(totals.protein)} g</strong></span>
          <span><i className="macro-dot fat" /><small>Gorduras</small><strong>{number(totals.fat)} g</strong></span>
        </div>
      </section>

      <div className="meal-sections">
        {PERIODS.map((period) => {
          const entries = day[period.id]
          const calories = entries.reduce((sum, entry) => sum + entry.calories, 0)
          const isCollapsed = collapsed[period.id]
          return (
            <section className="meal-card" key={period.id}>
              <button className="meal-heading" type="button" onClick={() => setCollapsed((current) => ({ ...current, [period.id]: !isCollapsed }))}>
                <span><strong>{period.label}</strong><small>{period.hint}</small></span>
                <span><b>{number(calories)} kcal</b>{isCollapsed ? <ChevronDown /> : <ChevronUp />}</span>
              </button>
              {!isCollapsed && (
                <>
                  <div className="meal-entries">
                    {entries.map((entry) => (
                      <div className="meal-entry" key={entry.id}>
                        <span><strong>{entry.name}</strong><small>{number(entry.grams)} g · {entry.source}</small></span>
                        <span><strong>{number(entry.calories)} kcal</strong><small>P {number(entry.protein, 1)} · C {number(entry.carbs, 1)} · G {number(entry.fat, 1)}</small></span>
                        <button className="icon-button danger" onClick={() => removeEntry(period.id, entry.id)} aria-label={`Excluir ${entry.name}`}><Trash2 /></button>
                      </div>
                    ))}
                    {!entries.length && <p className="empty-meal">Nenhum alimento registrado neste período.</p>}
                  </div>
                  <button className="add-food-button" type="button" onClick={() => setPickerPeriod(period.id)}><Plus /> Adicionar alimento</button>
                </>
              )}
            </section>
          )
        })}
      </div>
      {pickerPeriod && (
        <FoodPicker
          profile={profile}
          period={pickerPeriod}
          onAdd={addEntry}
          onSaveProfile={onSaveProfile}
          onClose={() => setPickerPeriod(null)}
        />
      )}
    </div>
  )
}

export function PredictionsView({ profile }) {
  const latestWeight = profile.records?.at(-1)?.weight ?? profile.data?.weight ?? ''
  const defaultTarget = profile.records?.at(-1)?.targetWeight ?? ''
  const [targetWeight, setTargetWeight] = useState(defaultTarget || latestWeight)
  const projection = getWeightProjection(profile, targetWeight)
  const averageCalories = getDiaryAverage(profile)
  const latestRecord = profile.records?.at(-1)

  return (
    <div className="prediction-page">
      <div className="page-heading">
        <p className="eyebrow"><ChartNoAxesCombined size={15} /> Tendência de {profile.name}</p>
        <h1>Previsão de peso</h1>
        <p>Uma projeção estatística baseada nos registros históricos, não uma promessa de resultado.</p>
      </div>

      <section className="prediction-hero">
        <div>
          <span className="source-pill">Meta simulada</span>
          <h2>Quando a tendência chega a</h2>
          <label className="target-weight-field"><input type="number" min="30" max="300" step="0.1" value={targetWeight} onChange={(event) => setTargetWeight(event.target.value)} /><b>kg</b></label>
        </div>
        <div className="prediction-result">
          {projection.status === 'projected' ? (
            <>
              <small>Estimativa atual</small>
              <strong>{new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }).format(projection.projectedDate)}</strong>
              <span>aproximadamente {number(projection.days)} dias, mantendo a tendência de {number(Math.abs(projection.weeklyRate), 2)} kg por semana</span>
            </>
          ) : (
            <>
              <CircleGauge />
              <strong>Ainda sem uma data confiável</strong>
              <span>{projection.message}</span>
            </>
          )}
        </div>
      </section>

      <div className="forecast-grid">
        <section className="panel forecast-card">
          <p className="eyebrow">Base histórica</p>
          <h2>{profile.records?.length ?? 0} registros de peso</h2>
          <p>A regressão usa todos os pesos salvos e os intervalos reais entre as avaliações.</p>
          {projection.dailyRate !== undefined && <strong className={projection.dailyRate <= 0 ? 'trend-down' : 'trend-up'}>{projection.dailyRate <= 0 ? '↓' : '↑'} {number(Math.abs(projection.dailyRate * 7), 2)} kg / semana</strong>}
        </section>
        <section className="panel forecast-card">
          <p className="eyebrow">Diário alimentar</p>
          <h2>{averageCalories ? `${number(averageCalories)} kcal / dia` : 'Sem média ainda'}</h2>
          <p>{averageCalories ? 'Média dos últimos dias com alimentação registrada.' : 'Registre refeições para comparar o consumo médio com sua meta.'}</p>
          {averageCalories && latestRecord && <strong className={averageCalories <= latestRecord.calories ? 'trend-down' : 'trend-up'}>{number(averageCalories - latestRecord.calories)} kcal versus a meta</strong>}
        </section>
      </div>

      <div className="health-note"><ChartNoAxesCombined size={22} /><div><strong>A projeção muda junto com os dados.</strong><p>Peso varia por hidratação, horário, ciclo hormonal e outros fatores. Use medições consistentes e acompanhamento profissional.</p></div></div>
    </div>
  )
}
