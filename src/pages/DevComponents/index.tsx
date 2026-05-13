import { useState } from 'react'
import { Search, Beef, AlertTriangle } from 'lucide-react'

import Button from '@/components/ui/Button.tsx'
import Input from '@/components/ui/Input.tsx'
import Textarea from '@/components/ui/Textarea.tsx'
import Select from '@/components/ui/Select.tsx'
import Card from '@/components/ui/Card.tsx'
import Badge from '@/components/ui/Badge.tsx'
import Modal from '@/components/ui/Modal.tsx'
import BottomSheet from '@/components/ui/BottomSheet.tsx'
import { Skeleton, SkeletonText, SkeletonCard } from '@/components/ui/Skeleton.tsx'
import EmptyState from '@/components/ui/EmptyState.tsx'
import AgrowareLogo from '@/assets/logo/AgrowareLogo.tsx'
import { useToast } from '@/hooks/useToast.ts'

// ─── Helpers de layout da página ─────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <h2 className="text-h2 text-gray-900 pb-2 border-b border-gray-200">{title}</h2>
      {children}
    </section>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <p className="text-caption text-gray-400 font-medium uppercase tracking-wide">{label}</p>
      <div className="flex flex-wrap items-center gap-3">{children}</div>
    </div>
  )
}

// ─── Página ───────────────────────────────────────────────────────────────────

export default function DevComponents() {
  const [modalOpen, setModalOpen] = useState(false)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const [selectValue, setSelectValue] = useState('')
  const toast = useToast()

  return (
    <div className="min-h-screen bg-gray-50">
      {/* cabeçalho fixo */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <p className="text-h1 text-gray-900">Sistema de Componentes</p>
            <p className="text-caption text-gray-400">
              /dev/components — validação visual da Etapa 2
            </p>
          </div>
          <AgrowareLogo size={32} variant="wordmark" />
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-10 space-y-14">

        {/* ── Logo ── */}
        <Section title="Logo">
          <Row label="Variantes">
            <AgrowareLogo size={24} variant="mark" />
            <AgrowareLogo size={32} variant="mark" />
            <AgrowareLogo size={48} variant="mark" />
            <AgrowareLogo size={64} variant="mark" />
          </Row>
          <Row label="Wordmark">
            <AgrowareLogo size={24} variant="wordmark" />
          </Row>
          <Row label="Wordmark — grande">
            <AgrowareLogo size={40} variant="wordmark" />
          </Row>
          <Row label="Earth dark">
            <AgrowareLogo size={40} variant="wordmark" color="#3E2723" />
          </Row>
        </Section>

        {/* ── Button ── */}
        <Section title="Button">
          <Row label="Variantes — tamanho md">
            <Button variant="primary">Salvar</Button>
            <Button variant="secondary">Cancelar</Button>
            <Button variant="ghost">Voltar</Button>
            <Button variant="danger">Excluir</Button>
          </Row>
          <Row label="Tamanhos — primary">
            <Button size="sm">Pequeno</Button>
            <Button size="md">Médio</Button>
            <Button size="lg">Grande</Button>
          </Row>
          <Row label="Com ícone">
            <Button icon={<Search size={16} />}>Buscar</Button>
            <Button icon={<Beef size={16} />} iconPosition="right" variant="secondary">
              Bovinos
            </Button>
          </Row>
          <Row label="Estados">
            <Button loading>Salvando...</Button>
            <Button disabled>Desabilitado</Button>
            <Button variant="secondary" loading>
              Carregando
            </Button>
          </Row>
          <Row label="Largura total">
            <div className="w-full max-w-xs">
              <Button fullWidth>Botão fullWidth</Button>
            </div>
          </Row>
        </Section>

        {/* ── Input ── */}
        <Section title="Input">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input
              label="Nome do bovino"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
            />
            <Input label="Email" type="email" required />
            <Input
              label="Buscar"
              icon={<Search size={16} />}
              placeholder=" "
            />
            <Input
              label="Com erro"
              error="Campo obrigatório"
              defaultValue=""
            />
            <Input label="Desabilitado" disabled defaultValue="Valor fixo" />
            <Input label="Com texto de ajuda" helperText="Use o brinco oficial do animal." />
          </div>
          {inputValue && (
            <p className="text-caption text-gray-400">Valor atual: {inputValue}</p>
          )}
        </Section>

        {/* ── Textarea ── */}
        <Section title="Textarea">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Textarea label="Observações" rows={3} />
            <Textarea
              label="Com erro"
              error="Máximo de 500 caracteres."
              rows={3}
            />
          </div>
        </Section>

        {/* ── Select ── */}
        <Section title="Select">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Select
              label="Raça"
              value={selectValue}
              onChange={(e) => setSelectValue(e.target.value)}
              options={[
                { value: 'nelore', label: 'Nelore' },
                { value: 'anelorado', label: 'Anelorado' },
                { value: 'brangus', label: 'Brangus' },
                { value: 'cruzado', label: 'Cruzado' },
                { value: 'outros', label: 'Outros' },
              ]}
            />
            <Select
              label="Finalidade (com erro)"
              error="Selecione uma opção."
              options={[
                { value: 'recria', label: 'Recria' },
                { value: 'engorda', label: 'Engorda' },
              ]}
            />
            <Select
              label="Desabilitado"
              disabled
              options={[{ value: 'nelore', label: 'Nelore' }]}
            />
          </div>
        </Section>

        {/* ── Badge ── */}
        <Section title="Badge">
          <Row label="Variantes — tamanho md">
            <Badge variant="ok">Ativo</Badge>
            <Badge variant="warning">Atenção</Badge>
            <Badge variant="alert">Crítico</Badge>
            <Badge variant="neutral">Inativo</Badge>
            <Badge variant="info">Informação</Badge>
          </Row>
          <Row label="Tamanho sm">
            <Badge variant="ok" size="sm">Ativo</Badge>
            <Badge variant="warning" size="sm">Atenção</Badge>
            <Badge variant="alert" size="sm">Crítico</Badge>
            <Badge variant="neutral" size="sm">Inativo</Badge>
            <Badge variant="info" size="sm">Info</Badge>
          </Row>
          <Row label="Uso contextual">
            <Badge variant="ok">Lote A: 25 cab.</Badge>
            <Badge variant="alert">C-03: 12%</Badge>
            <Badge variant="warning">Pesagem atrasada</Badge>
          </Row>
        </Section>

        {/* ── Card ── */}
        <Section title="Card">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <p className="text-body text-gray-600">Card simples com conteúdo.</p>
            </Card>

            <Card
              header={
                <div className="flex items-center justify-between">
                  <p className="text-body font-medium text-gray-900">Com cabeçalho</p>
                  <Badge variant="ok">Ativo</Badge>
                </div>
              }
              footer={
                <div className="flex justify-end">
                  <Button size="sm" variant="ghost">Ação</Button>
                </div>
              }
            >
              <p className="text-body text-gray-600">Card com header e footer.</p>
            </Card>

            <Card
              interactive
              onClick={() => alert('Card clicado')}
              header={<p className="text-body font-medium text-gray-900">Card interativo</p>}
            >
              <p className="text-caption text-gray-400">Hover para ver o lift. Clicável.</p>
            </Card>

            <Card padding="lg">
              <p className="text-body text-gray-600">Padding grande (lg = 24px).</p>
            </Card>
          </div>
        </Section>

        {/* ── Skeleton ── */}
        <Section title="Skeleton">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <p className="text-caption text-gray-400">Linhas de texto</p>
              <SkeletonText lines={4} />
            </div>
            <div className="space-y-3">
              <p className="text-caption text-gray-400">Card completo</p>
              <SkeletonCard />
            </div>
            <div className="space-y-3">
              <p className="text-caption text-gray-400">Formas variadas</p>
              <div className="flex items-center gap-3">
                <Skeleton className="h-12 w-12" rounded />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
              <Skeleton className="h-32 w-full" />
            </div>
          </div>
        </Section>

        {/* ── EmptyState ── */}
        <Section title="EmptyState">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <EmptyState
                title="Nenhum bovino cadastrado"
                description="Adicione o primeiro animal ao rebanho para começar."
                icon={<Beef size={28} />}
                action={{ label: 'Cadastrar bovino', onClick: () => {} }}
              />
            </Card>
            <Card>
              <EmptyState
                title="Sem alertas"
                description="Todos os cochos estão abastecidos."
                icon={<AlertTriangle size={28} />}
              />
            </Card>
          </div>
        </Section>

        {/* ── Toast ── */}
        <Section title="Toast">
          <Row label="Disparar">
            <Button
              variant="primary"
              size="sm"
              onClick={() => toast.success('Bovino salvo com sucesso!')}
            >
              Sucesso
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => toast.error('Não foi possível salvar. Tente novamente.')}
            >
              Erro
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => toast.warning('Cocho C-03 em estado crítico (12%).')}
            >
              Aviso
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => toast.info('Lote B transferido para o Piquete 2.')}
            >
              Info
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                toast.success('Primeiro toast')
                setTimeout(() => toast.warning('Segundo toast'), 400)
                setTimeout(() => toast.error('Terceiro toast'), 800)
              }}
            >
              Empilhar 3
            </Button>
          </Row>
        </Section>

        {/* ── Modal ── */}
        <Section title="Modal">
          <Row label="Abrir">
            <Button onClick={() => setModalOpen(true)}>Abrir Modal</Button>
          </Row>

          <Modal
            isOpen={modalOpen}
            onClose={() => setModalOpen(false)}
            title="Confirmar lotação"
            description="Revise os dados antes de confirmar a operação."
            footer={
              <>
                <Button variant="ghost" onClick={() => setModalOpen(false)}>
                  Cancelar
                </Button>
                <Button
                  variant="primary"
                  onClick={() => {
                    setModalOpen(false)
                    toast.success('Lotação confirmada!')
                  }}
                >
                  Confirmar
                </Button>
              </>
            }
          >
            <p className="text-body text-gray-600">
              <strong>Lote B (40 cabeças, 420 kg méd.)</strong> será alocado no{' '}
              <strong>Piquete 2 (4,8 ha)</strong>. Taxa resultante:{' '}
              <span className="font-data text-warning-dark font-medium">
                3,11 UA/ha
              </span>{' '}
              — acima do ideal para Mombaça (3,0 UA/ha).
            </p>
          </Modal>
        </Section>

        {/* ── BottomSheet ── */}
        <Section title="BottomSheet">
          <Row label="Abrir (drag para fechar)">
            <Button variant="secondary" onClick={() => setSheetOpen(true)}>
              Abrir Bottom Sheet
            </Button>
          </Row>

          <BottomSheet
            isOpen={sheetOpen}
            onClose={() => setSheetOpen(false)}
            title="Detalhes do Piquete 1"
            footer={
              <div className="flex gap-3">
                <Button variant="ghost" fullWidth onClick={() => setSheetOpen(false)}>
                  Fechar
                </Button>
                <Button fullWidth onClick={() => setSheetOpen(false)}>
                  Ver detalhes
                </Button>
              </div>
            }
          >
            <div className="space-y-4">
              <div className="flex gap-2 flex-wrap">
                <Badge variant="ok">Ativo</Badge>
                <Badge variant="neutral">5,2 ha</Badge>
                <Badge variant="info">Capim Mombaça</Badge>
              </div>
              <p className="text-body text-gray-600">
                Lote A (Recria) &middot; 25 cabeças &middot; 285 kg médio
              </p>
              <p className="text-body text-gray-600">
                Arraste o sheet para baixo ou toque no backdrop para fechar.
              </p>
              <Skeleton className="h-24 w-full" />
            </div>
          </BottomSheet>
        </Section>

        {/* rodapé da página dev */}
        <div className="border-t border-gray-200 pt-6 text-center">
          <p className="text-caption text-gray-400">
            Etapa 2 — Sistema de Componentes &middot; Não incluso na navegação de produção
          </p>
        </div>

      </div>
    </div>
  )
}
