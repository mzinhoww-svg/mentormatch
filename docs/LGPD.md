# LGPD — Privacidade e Proteção de Dados

> Consolidado do ADR v1.1 §4 (ver [ADR.md](./ADR.md)). Complementa
> [SECURITY.md](./SECURITY.md) e [TENANCY.md](./TENANCY.md). Documento vivo; as
> rotinas operacionais entram com a camada de dados.

## 1. Princípios

- **LGPD desde o cadastro.** Privacidade por padrão, não como opção posterior.
- **Minimização:** coletar só o necessário; expor ainda menos.
- **Isolamento por tenant** reforça a separação de titulares entre empresas.

## 2. Consentimento

- **Obrigatório no cadastro** e **atômico** com a criação da conta — sem
  consentimento, **não há usuário ativado**.
- **Termos versionados.** O registro de consentimento (`consent_record`) guarda:
  **versão dos termos**, **timestamp** e **IP** (quando disponível).
- Mudança de termos ⇒ nova versão ⇒ novo consentimento quando exigido.

## 3. ContactInfo (dado sensível de contato)

- **WhatsApp e e-mail de contato só são revelados após o match aceito.**
- O **e-mail de autenticação é credencial**, não contato público — nunca exibido
  como meio de contato.
- A **revelação de ContactInfo é uma ação auditável** (`contact_info.revealed`): o
  evento registra **que** houve revelação (ator, alvo, request), **nunca** o valor
  bruto. O logger/audit **mascaram** e-mail/telefone/CPF por padrão (ver
  [SECURITY.md](./SECURITY.md)).

## 4. Exclusão e retenção

- **Exclusão por tenant.**
- **Soft delete por 30 dias → purge** definitivo.
- Dados relacionais **anonimizados** quando necessário (preservar integridade
  estatística sem reter PII).

## 5. Auditoria

- **Auditoria append-only** dos eventos sensíveis. A base já existe
  (`src/observability/audit.ts`) com a taxonomia pré-declarada: login, logout,
  **consentimento**, criação de tenant, mudança de papel, **revelação de
  ContactInfo**, **exportação**, **exclusão**.
- Metadados de auditoria são **redigidos** (sem PII/segredos no payload).

## 6. Direitos do titular (a operacionalizar)

| Direito | Onde será atendido |
|---|---|
| Acesso / portabilidade | exportação por titular/tenant (evento `data.exported`) |
| Correção | edição de perfil dentro do tenant |
| Eliminação | exclusão por tenant + soft-delete/purge (§4) |
| Revogação de consentimento | fluxo de consentimento versionado (§2) |

## 7. Pendências (próximas fatias)
Fluxos de exportação e exclusão self-service, política de retenção por tipo de dado,
DPA por tenant, e mapeamento de subprocessadores (Vercel, Supabase, Blob).
