"""Handlers: /spice, spice callbacks"""
from aiogram import Router, F
from aiogram.types import Message, CallbackQuery
from aiogram.filters import Command

from services.api_client import api
from services.redis_client import set_state
from keyboards.main import spices_keyboard, cancel_keyboard
from utils.formatters import format_spice

router = Router()


@router.message(Command("spice"))
@router.message(F.text == "🌶 Специи")
async def cmd_spice(message: Message):
    parts = message.text.split(maxsplit=1) if message.text else []
    query = parts[1].strip() if len(parts) > 1 else ""

    spices = await api.spices(q=query)
    if not spices:
        if query:
            await message.answer(f"😔 Специя «{query}» не найдена.")
        else:
            await message.answer("😔 Не удалось загрузить специи.")
        return

    if len(spices) == 1:
        # Single match — show immediately
        text = format_spice(spices[0])
        await message.answer(text, parse_mode="Markdown")
        return

    await message.answer(
        f"🌶 *База специй*{f' — «{query}»' if query else ''}\n\nВыберите специю:",
        parse_mode="Markdown",
        reply_markup=spices_keyboard(spices[:20]),
    )


@router.callback_query(F.data.startswith("spice:"))
async def cb_spice(callback: CallbackQuery):
    spice_id = int(callback.data.split(":")[1])
    spice = await api.get_spice(spice_id)
    if not spice:
        await callback.answer("Специя не найдена", show_alert=True)
        return
    text = format_spice(spice)
    await callback.message.answer(text, parse_mode="Markdown")
    await callback.answer()
