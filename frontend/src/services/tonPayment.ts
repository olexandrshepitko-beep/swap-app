import { beginCell } from 'ton'
import type { TonConnectUI } from '@tonconnect/ui-react'

/**
 * Строит payload-ячейку с текстовым комментарием в стандартном формате
 * TON (opcode 0 + строка) — именно так кошельки показывают "комментарий
 * к переводу", и именно по нему бэкенд матчит транзакцию с оплатой.
 *
 * ВАЖНО: если сборка ругается на импорт beginCell из 'ton' — в вашей
 * версии пакета он может быть только в 'ton-core' / '@ton/core'.
 * Проверьте фактические экспорты установленной версии ('ton'@13.9.0
 * в package.json на момент патча).
 */
function buildCommentPayload(comment: string): string {
  const cell = beginCell().storeUint(0, 32).storeStringTail(comment).endCell()
  return cell.toBoc().toString('base64')
}

export async function sendTonPayment(
  tonConnectUI: TonConnectUI,
  address: string,
  amountNanoton: number,
  comment: string
): Promise<void> {
  await tonConnectUI.sendTransaction({
    validUntil: Math.floor(Date.now() / 1000) + 300, // 5 минут на подтверждение в кошельке
    messages: [
      {
        address,
        amount: String(amountNanoton),
        payload: buildCommentPayload(comment),
      },
    ],
  })
  // sendTransaction резолвится, когда пользователь подписал транзакцию в
  // кошельке — это НЕ значит, что она уже включена в блокчейн. Реальное
  // подтверждение — только через backend-поллинг /payment/ton/verify.
}
