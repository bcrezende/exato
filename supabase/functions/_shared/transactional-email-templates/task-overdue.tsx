import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Img, Preview, Text, Section, Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = "exato"
const LOGO_URL = "https://nfrhxwehfqerasvlfnxv.supabase.co/storage/v1/object/public/email-assets/logo-dark.png"

interface Props {
  taskTitle?: string
  dueTime?: string
  assigneeName?: string
}

const TaskOverdueEmail = ({ taskTitle, dueTime, assigneeName }: Props) => (
  <Html lang="pt-BR" dir="ltr">
    <Head />
    <Preview>Prazo excedido: {taskTitle || 'Tarefa'}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img src={LOGO_URL} alt={SITE_NAME} height="48" style={logo} />
        <Heading style={h1}>⚠️ Prazo excedido</Heading>
        {assigneeName && <Text style={text}>Olá, {assigneeName}!</Text>}
        <Section style={card}>
          <Text style={cardTitle}>{taskTitle || 'Tarefa sem título'}</Text>
          <Text style={cardDetail}>Prazo final: <strong>{dueTime || '—'}</strong></Text>
        </Section>
        <Text style={text}>
          O prazo desta tarefa expirou e ela ainda não foi concluída. 
          Acesse a plataforma para atualizar o status.
        </Text>
        <Hr style={hr} />
        <Text style={footer}>{SITE_NAME} — Gestão de tarefas</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: TaskOverdueEmail,
  subject: (data: Record<string, any>) => `⚠️ Prazo excedido: ${data.taskTitle || 'Tarefa'}`,
  displayName: 'Prazo excedido',
  previewData: { taskTitle: 'Relatório mensal', dueTime: '17:00', assigneeName: 'João' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Inter', Arial, sans-serif" }
const container = { padding: '20px 25px', maxWidth: '560px' }
const logo = { margin: '0 0 24px' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: 'hsl(222, 47%, 11%)', margin: '0 0 20px' }
const text = { fontSize: '14px', color: 'hsl(220, 9%, 46%)', lineHeight: '1.5', margin: '0 0 16px' }
const card = { backgroundColor: '#fffbeb', borderRadius: '12px', padding: '16px 20px', margin: '0 0 20px', borderLeft: '4px solid hsl(38, 92%, 50%)' }
const cardTitle = { fontSize: '16px', fontWeight: '600' as const, color: 'hsl(222, 47%, 11%)', margin: '0 0 8px' }
const cardDetail = { fontSize: '14px', color: 'hsl(220, 9%, 46%)', margin: '0' }
const hr = { borderColor: '#e5e7eb', margin: '24px 0' }
const footer = { fontSize: '12px', color: '#999999', margin: '0' }
