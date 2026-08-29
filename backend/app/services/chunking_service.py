def chunk_text(text: str, chunk_size: int = 1000, chunk_overlap: int = 200) -> list[str]:
    """Split text into overlapping chunks.
    
    Uses sentence-aware splitting to avoid cutting mid-sentence when possible.
    """
    if not text or not text.strip():
        return []
    
    text = text.strip()
    
    if len(text) <= chunk_size:
        return [text]
    
    chunks = []
    start = 0
    
    while start < len(text):
        end = start + chunk_size
        
        if end >= len(text):
            chunks.append(text[start:].strip())
            break
        
        # Try to find a sentence boundary near the end
        # Look for period, question mark, or exclamation mark followed by space
        best_break = -1
        search_start = max(start + chunk_size // 2, start)  # Don't break too early
        
        for i in range(end, search_start, -1):
            if i < len(text) and text[i-1] in '.!?\n' and (i >= len(text) or text[i] in ' \n\t'):
                best_break = i
                break
        
        if best_break > start:
            chunks.append(text[start:best_break].strip())
            start = best_break - chunk_overlap
        else:
            # No good sentence break found, just split at chunk_size
            chunks.append(text[start:end].strip())
            start = end - chunk_overlap
        
        if start < 0:
            start = 0
    
    # Remove any empty chunks
    return [c for c in chunks if c.strip()]
