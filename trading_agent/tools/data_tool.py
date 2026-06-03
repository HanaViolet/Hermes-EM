from __future__ import annotations

from io import StringIO
from pathlib import Path

import pandas as pd
import requests

DATA_CACHE_DIR = Path("data/cache")

YAHOO_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept": "application/json,text/plain,*/*",
    "Accept-Language": "en-US,en;q=0.9",
    "Referer": "https://finance.yahoo.com/",
}


# ─── OHLCV normalization ───────────────────────────────────────────

def normalize_ohlcv(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()

    if isinstance(df.columns, pd.MultiIndex):
        df.columns = df.columns.get_level_values(0)

    if df.index.name in ["Date", "Datetime"] or "Date" in df.index.names:
        df = df.reset_index()

    df.columns = [
        str(c).lower().replace(" ", "_").strip()
        for c in df.columns
    ]

    rename_map = {
        "datetime": "date",
        "adj_close": "close",
    }

    df = df.rename(columns=rename_map)

    required = ["date", "open", "high", "low", "close", "volume"]
    missing = [c for c in required if c not in df.columns]

    if missing:
        raise ValueError(
            f"Missing OHLCV columns: {missing}. Current columns: {list(df.columns)}"
        )

    df = df[required].dropna()
    df["date"] = pd.to_datetime(df["date"], errors="coerce").dt.tz_localize(None)

    for col in ["open", "high", "low", "close", "volume"]:
        df[col] = pd.to_numeric(df[col], errors="coerce")

    df = df.dropna()
    df = df.sort_values("date").drop_duplicates("date")

    return df.reset_index(drop=True)


# ─── Cache I/O ─────────────────────────────────────────────────────

def read_cached_ohlcv(ticker: str) -> pd.DataFrame | None:
    cache_path = DATA_CACHE_DIR / f"{ticker}.csv"

    if not cache_path.exists():
        return None

    df = pd.read_csv(cache_path)

    if df.empty:
        return None

    return normalize_ohlcv(df)


def write_cached_ohlcv(ticker: str, df: pd.DataFrame) -> None:
    DATA_CACHE_DIR.mkdir(parents=True, exist_ok=True)
    cache_path = DATA_CACHE_DIR / f"{ticker}.csv"

    df = normalize_ohlcv(df)
    df.to_csv(cache_path, index=False)


# ─── Date helpers ──────────────────────────────────────────────────

def slice_ohlcv(df: pd.DataFrame, start, end) -> pd.DataFrame:
    start_ts = pd.Timestamp(start)
    end_ts = pd.Timestamp(end)

    return df[
        (df["date"] >= start_ts) &
        (df["date"] <= end_ts)
    ].sort_values("date").reset_index(drop=True)


def cache_covers_range(df: pd.DataFrame | None, start, end) -> bool:
    if df is None or df.empty:
        return False

    start_ts = pd.Timestamp(start)
    end_ts = pd.Timestamp(end)

    return (
        df["date"].min() <= start_ts and
        df["date"].max() >= end_ts - pd.Timedelta(days=7)
    )


# ─── Yahoo Chart API downloader ────────────────────────────────────

def download_from_yahoo_chart(ticker: str, start, end) -> pd.DataFrame:
    start_ts = pd.Timestamp(start)
    end_ts = pd.Timestamp(end)

    params = {
        "period1": int(start_ts.timestamp()),
        "period2": int((end_ts + pd.Timedelta(days=1)).timestamp()),
        "interval": "1d",
        "includeAdjustedClose": "true",
        "events": "div|split|capitalGains",
    }

    last_error = None

    for host in ["query1.finance.yahoo.com", "query2.finance.yahoo.com"]:
        url = f"https://{host}/v8/finance/chart/{ticker}"

        try:
            response = requests.get(
                url,
                params=params,
                headers=YAHOO_HEADERS,
                timeout=20,
            )
            response.raise_for_status()

            payload = response.json()
            chart = payload.get("chart", {})
            result = (chart.get("result") or [None])[0]

            if result is None:
                raise ValueError(f"Yahoo returned no result for {ticker}.")

            timestamps = result.get("timestamp") or []

            quote = (
                result.get("indicators", {})
                .get("quote", [{}])[0]
            )

            if not timestamps or not quote:
                raise ValueError(f"Yahoo returned empty quote for {ticker}.")

            df = pd.DataFrame({
                "date": pd.to_datetime(timestamps, unit="s").normalize(),
                "open": quote.get("open"),
                "high": quote.get("high"),
                "low": quote.get("low"),
                "close": quote.get("close"),
                "volume": quote.get("volume"),
            })

            return normalize_ohlcv(df)

        except Exception as exc:
            last_error = exc

    raise RuntimeError(f"Yahoo chart API failed for {ticker}: {last_error}")


# ─── Stooq CSV fallback ────────────────────────────────────────────

def download_from_stooq_csv(ticker: str, start, end) -> pd.DataFrame:
    stooq_ticker = ticker if ticker.endswith(".US") else f"{ticker}.US"

    response = requests.get(
        "https://stooq.com/q/d/l/",
        params={
            "s": stooq_ticker,
            "i": "d",
            "d1": pd.Timestamp(start).strftime("%Y%m%d"),
            "d2": pd.Timestamp(end).strftime("%Y%m%d"),
        },
        timeout=20,
    )
    response.raise_for_status()

    text = response.text.strip()

    if "apikey" in text.lower() or "get your apikey" in text.lower():
        raise ValueError("Stooq CSV download requires an API key.")

    df = pd.read_csv(StringIO(text))

    if df.empty:
        raise ValueError(f"Stooq returned empty data for {ticker}.")

    df = df.rename(columns={
        "Date": "date",
        "Open": "open",
        "High": "high",
        "Low": "low",
        "Close": "close",
        "Volume": "volume",
    })

    return normalize_ohlcv(df)


# ─── Unified download with fallback ────────────────────────────────

def download_price_data(ticker: str, start, end) -> pd.DataFrame:
    errors = []

    for loader in [
        lambda: download_from_yahoo_chart(ticker, start, end),
        lambda: download_from_stooq_csv(ticker, start, end),
    ]:
        try:
            return loader()
        except Exception as exc:
            errors.append(str(exc))

    raise RuntimeError(
        f"{ticker} historical data download failed: {' | '.join(errors)}"
    )


# ─── Public API ────────────────────────────────────────────────────

def get_price_data(
    ticker: str,
    start_date: str,
    end_date: str,
    refresh_if_needed: bool = False,
) -> pd.DataFrame:
    ticker = ticker.upper().replace(".US", "").strip()

    start = pd.Timestamp(start_date)
    end = pd.Timestamp(end_date)

    if start > end:
        raise ValueError("start_date must be earlier than end_date.")

    cached = read_cached_ohlcv(ticker)

    if cached is not None and not cached.empty:
        cached_slice = slice_ohlcv(cached, start, end)

        if not cached_slice.empty and not refresh_if_needed:
            return cached_slice

        if cache_covers_range(cached, start, end):
            return cached_slice

    downloaded = download_price_data(ticker, start, end)

    if cached is not None and not cached.empty:
        merged = pd.concat([cached, downloaded], ignore_index=True)
    else:
        merged = downloaded

    merged = normalize_ohlcv(merged)
    write_cached_ohlcv(ticker, merged)

    result = slice_ohlcv(merged, start, end)

    if result.empty:
        raise ValueError(f"No available data for {ticker}: {start_date} to {end_date}")

    return result
