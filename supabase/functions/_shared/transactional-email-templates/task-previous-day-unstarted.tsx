import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Img, Preview, Text, Section, Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = "exato"
const LOGO_URL = "https://nfrhxwehfqerasvlfnxv.supabase.co/storage/v1/object/public/email-assets/logo-dark.png"

interface Props {
  taskTitle?: string
  originalDate?: string
  assigneeName?: string
}

const TaskPreviousDayUnstartedEmail = ({ taskTitle, originalDate, assigneeName }: Props) => (
  <Html lang="pt-BR" dir="ltr">
    <Head />
    <Preview>Tarefa de ontem sem início: {taskTitle || 'Tarefa'}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img src={LOGO_URL} alt={SITE_NAME} height="48" style={logo} />
        <Heading style={h1}>📋 Tarefa de ontem sem início</Heading>
        {assigneeName && <Text style={text}>Olá, {assigneeName}!</Text>}
        <Section style={card}>
          <Text style={cardTitle}>{taskTitle || 'Tarefa sem título'}</Text>
          <Text style={cardDetail}>Data original: <strong>{originalDate || '—'}</strong></Text>
        </Section>
        <Text style={text}>
          Esta tarefa do dia anterior não foi iniciada. 
          Verifique na plataforma se precisa ser reagendada ou concluída.
        </Text>
        <Hr style={hr} />
        <Text style={footer}>{SITE_NAME} — Gestão de tarefas</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: TaskPreviousDayUnstartedEmail,
  subject: (data: Record<string, any>) => `📋 Tarefa de ontem sem início: ${data.taskTitle || 'Tarefa'}`,
  displayName: 'Tarefa de ontem sem início',
  previewData: { taskTitle: 'Relatório mensal', originalDate: '25/03/2026', assigneeName: 'João' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Inter', Arial, sans-serif" }
const container = { padding: '20px 25px', maxWidth: '560px' }
const logo = { margin: '0 0 24px' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: 'hsl(222, 47%, 11%)', margin: '0 0 20px' }
const text = { fontSize: '14px', color: 'hsl(220, 9%, 46%)', lineHeight: '1.5', margin: '0 0 16px' }
const card = { backgroundColor: '#f0f4ff', borderRadius: '12px', padding: '16px 20px', margin: '0 0 20px', borderLeft: '4px solid hsl(221, 83%, 53%)' }
const cardTitle = { fontSize: '16px', fontWeight: '600' as const, color: 'hsl(222, 47%, 11%)', margin: '0 0 8px' }
const cardDetail = { fontSize: '14px', color: 'hsl(220, 9%, 46%)', margin: '0' }
const hr = { borderColor: '#e5e7eb', margin: '24px 0' }
const footer = { fontSize: '12px', color: '#999999', margin: '0' }
