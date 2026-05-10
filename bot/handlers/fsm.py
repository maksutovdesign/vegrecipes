"""FSM message handler — processes text input based on current state."""
from aiogram import Router, F
from aiogram.types import Message

from services.api_client import api
from services.redis_client import get_state, clear_state, save_user_token, set_state
from keyboards.main import main_menu
from utils.formatters import format_recipe_list

router = Router()


@router.message(F.text & ~F.text.startswith("/"))
async def fsm_handler(message: Message, access_token: str | None, api_user: dict | None):
    """Central FSM dispatcher — routes text messages based on Redis state."""
    tg_id = message.from_user.id
    state, data = await get_state(tg_id)

    # ── Search ────────────────────────────────────────────────────
    if state == "search:waiting":
        await clear_state(tg_id)
        query = message.text.strip()
        result = await api.search_recipes(q=query, page=1, size=5)
        items = result.get("items", [])
        total = result.get("total", 0)
        if not items:
            await message.answer(f"😔 По запросу «{query}» ничего не найдено.")
            return
        from keyboards.main import search_pagination
        total_pages = max(1, (total + 4) // 5)
        text = format_recipe_list(items, page=1, total=total)
        kb = search_pagination(query, 1, total_pages) if total_pages > 1 else None
        await message.answer(text, parse_mode="MarkdownV2", reply_markup=kb)

    # ── Fridge (PRO only) ─────────────────────────────────────────
    elif state == "fridge:waiting":
        await clear_state(tg_id)
        is_pro = api_user and api_user.get("sub_type") == "pro"
        if not is_pro:
            from keyboards.main import pro_keyboard
            await message.answer(
                "👑 Сканер холодильника доступен только в PRO\\.",
                parse_mode="MarkdownV2",
                reply_markup=pro_keyboard(),
            )
            return
        ingredients = message.text.strip()
        await message.answer("⏳ Анализирую...")
        matches = await api.fridge_suggest(ingredients)
        ai_answer = await api.fridge_ai(ingredients, access_token)
        lines = [f"🧊 *Результаты для:* _{ingredients}_\n"]
        if matches:
            lines.append("📋 *Рецепты из базы:*")
            for m in matches[:5]:
                pct = m.get("match_percent", 0)
                lines.append(f"• *{m['title']}* — {pct}%")
                lines.append(f"  /recipe\\_{m['recipe_id']}")
        lines.append(f"\n🤖 *AI:*\n{ai_answer}")
        await message.answer("\n".join(lines), parse_mode="MarkdownV2")

    # ── AI question about recipe ──────────────────────────────────
    elif state == "ask_recipe":
        recipe_id = data.get("recipe_id")
        await clear_state(tg_id)
        question = message.text.strip()
        await message.answer("🤖 Думаю...")
        answer = await api.ask_recipe(recipe_id, question, access_token)
        await message.answer(
            f"🤖 *AI-ассистент*\n\n"
            f"❓ _{question}_\n\n"
            f"{answer}",
            parse_mode="Markdown",
        )

    # ── Login FSM ─────────────────────────────────────────────────
    elif state == "login:email":
        await set_state(tg_id, "login:password", {"email": message.text.strip()})
        await message.answer("🔑 Введите *пароль*:", parse_mode="Markdown")

    elif state == "login:password":
        email = data.get("email", "")
        password = message.text.strip()
        await clear_state(tg_id)
        # Delete password message for security
        try:
            await message.delete()
        except Exception:
            pass
        result = await api.login(email, password)
        if not result:
            await message.answer("❌ Неверный email или пароль. Попробуйте /login снова.")
            return
        await save_user_token(tg_id, result["access_token"], result["refresh_token"])
        user = await api.me(result["access_token"])
        is_pro = user and user.get("sub_type") == "pro"
        name = user.get("display_name") or user.get("email", "") if user else email
        await message.answer(
            f"✅ Добро пожаловать, *{name}*\\!",
            parse_mode="MarkdownV2",
            reply_markup=main_menu(is_pro=bool(is_pro)),
        )

    # ── Register FSM ──────────────────────────────────────────────
    elif state == "register:email":
        await set_state(tg_id, "register:username", {"email": message.text.strip()})
        await message.answer("👤 Введите *имя пользователя* (латиницей):", parse_mode="Markdown")

    elif state == "register:username":
        await set_state(tg_id, "register:password", {**data, "username": message.text.strip()})
        await message.answer("🔑 Придумайте *пароль* (минимум 6 символов):", parse_mode="Markdown")

    elif state == "register:password":
        password = message.text.strip()
        try:
            await message.delete()
        except Exception:
            pass
        await clear_state(tg_id)
        result = await api.register(data["email"], data["username"], password)
        if not result:
            await message.answer(
                "❌ Ошибка регистрации. Возможно, email уже занят. Попробуйте /login или /me."
            )
            return
        await save_user_token(tg_id, result["access_token"], result["refresh_token"])
        user = await api.me(result["access_token"])
        await message.answer(
            "✅ *Аккаунт создан\\!*\n\nДобро пожаловать в VegRecipes\\! 🥗",
            parse_mode="MarkdownV2",
            reply_markup=main_menu(),
        )

    # ── Unrecognised ──────────────────────────────────────────────
    else:
        # Try to interpret as search query
        query = message.text.strip()
        if len(query) >= 3:
            result = await api.search_recipes(q=query, page=1, size=5)
            items = result.get("items", [])
            if items:
                text = format_recipe_list(items, total=result.get("total", 0))
                await message.answer(text, parse_mode="MarkdownV2")
                return
        await message.answer(
            "😕 Не понял команду. Попробуйте /help или воспользуйтесь меню.",
            reply_markup=main_menu(is_pro=bool(api_user and api_user.get("sub_type") == "pro")),
        )
