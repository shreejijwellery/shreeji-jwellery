import React, { useState } from 'react';
import Select from 'react-select';
import { FaTimes } from 'react-icons/fa';

const itemImageSrc = (url) =>
  url ? `/api/item-image?url=${encodeURIComponent(url)}` : null;

export default function ItemSelectWithImage({
  items = [],
  value,
  onChange,
  placeholder = 'Select Item',
  noOptionsMessage = 'No items',
  isMulti = false,
  className = '',
  classNamePrefix = 'select',
  styles = {},
  ...rest
}) {
  const [imagePreviewUrl, setImagePreviewUrl] = useState(null);

  const options = items.map((item) => ({
    value: item._id,
    label: item.name,
    imageUrl: item.imageUrl,
    rate: item.rate,
  }));

  const selectedId = value && (typeof value === 'object' && value !== null && 'value' in value) ? value.value : value;
  const selectedOption = isMulti
    ? options.filter((o) => Array.isArray(value) && value.includes(o.value))
    : options.find((o) => o.value === selectedId) || null;

  const formatOptionLabel = (option) => {
    const src = itemImageSrc(option.imageUrl);
    const handleImageClick = (e) => {
      e.stopPropagation();
      e.preventDefault();
      if (src) setImagePreviewUrl(src);
    };
    return (
      <div className="flex items-center gap-2">
        {src ? (
          <button
            type="button"
            onClick={handleImageClick}
            className="flex-shrink-0 rounded border border-gray-200 overflow-hidden hover:ring-2 hover:ring-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <img src={src} alt="" className="h-8 w-8 object-cover" />
          </button>
        ) : (
          <div className="h-8 w-8 flex-shrink-0 rounded border border-gray-200 bg-gray-100 flex items-center justify-center text-gray-400 text-xs">
            —
          </div>
        )}
        <span>{option.label}</span>
      </div>
    );
  };

  const ItemInput = (props) => {
    const { selectProps } = props;
    const hideInput = !isMulti && !!selectProps.value && !selectProps.menuIsOpen;
    const inputPlaceholder = selectProps.menuIsOpen ? 'Search...' : placeholder;
    return (
      <input
        {...props}
        placeholder={inputPlaceholder}
        style={{
          ...props.style,
          ...(hideInput && {
            width: 0,
            minWidth: 0,
            opacity: 0,
            pointerEvents: 'none',
            position: 'absolute',
          }),
        }}
      />
    );
  };

  const ItemPlaceholder = () => null;

  const SingleValue = ({ data }) => {
    const [imgError, setImgError] = useState(false);
    const rawSrc = data?.imageUrl ? itemImageSrc(data.imageUrl) : null;
    const src = rawSrc && !imgError ? rawSrc : null;
    const handleImageClick = (e) => {
      e.stopPropagation();
      if (rawSrc) setImagePreviewUrl(rawSrc);
    };
    const showPlaceholder = !src;
    return (
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleImageClick}
          className={`flex-shrink-0 rounded border overflow-hidden focus:outline-none focus:ring-2 focus:ring-blue-400 ${
            showPlaceholder
              ? 'h-8 w-8 border-gray-200 bg-gray-100 flex items-center justify-center text-gray-400 hover:bg-gray-200'
              : 'h-8 w-8 border-gray-200 hover:ring-2 hover:ring-blue-300'
          }`}
        >
          {src ? (
            <img
              src={src}
              alt=""
              className="h-8 w-8 object-cover block"
              onError={() => setImgError(true)}
            />
          ) : (
            <span className="text-xs text-gray-400">—</span>
          )}
        </button>
        <span className="font-medium text-gray-800 truncate">{data?.label ?? placeholder}</span>
      </div>
    );
  };

  const MultiValueLabel = ({ data }) => {
    const src = itemImageSrc(data?.imageUrl);
    const handleImageClick = (e) => {
      e.stopPropagation();
      if (src) setImagePreviewUrl(src);
    };
    return (
      <div className="flex items-center gap-1.5">
        {src ? (
          <button
            type="button"
            onClick={handleImageClick}
            className="flex-shrink-0 rounded border border-gray-200 overflow-hidden hover:ring-2 hover:ring-blue-400"
          >
            <img src={src} alt="" className="h-5 w-5 object-cover" />
          </button>
        ) : (
          <div className="h-5 w-5 flex-shrink-0 rounded border border-gray-200 bg-gray-100" />
        )}
        <span>{data.label}</span>
      </div>
    );
  };

  const handleChange = (selected) => {
    if (isMulti) {
      onChange(selected ? selected.map((o) => o.value) : []);
    } else {
      onChange(selected || null);
    }
  };

  return (
    <>
      <Select
        isClearable
        isSearchable
        isMulti={isMulti}
        placeholder={placeholder}
        options={options}
        value={selectedOption}
        onChange={handleChange}
        formatOptionLabel={formatOptionLabel}
        getOptionLabel={(o) => o.label}
        getOptionValue={(o) => o.value}
        noOptionsMessage={() => noOptionsMessage}
        classNamePrefix={classNamePrefix}
        className={`basic-single ${className}`}
        components={{
          SingleValue: isMulti ? undefined : SingleValue,
          Input: ItemInput,
          Placeholder: ItemPlaceholder,
          ...(isMulti && { MultiValueLabel }),
        }}
        styles={{
          control: (base) => ({ ...base, minHeight: 38 }),
          valueContainer: (base) => ({ ...base, padding: '0 8px' }),
          singleValue: (base) => ({ ...base, margin: 0 }),
          ...styles,
        }}
        {...rest}
      />
      {imagePreviewUrl && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4"
          onClick={() => setImagePreviewUrl(null)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Escape' && setImagePreviewUrl(null)}
          aria-label="Close image"
        >
          <button
            type="button"
            onClick={() => setImagePreviewUrl(null)}
            className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors z-10"
            aria-label="Close"
          >
            <FaTimes className="w-6 h-6" />
          </button>
          <img
            src={imagePreviewUrl}
            alt="Item"
            className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            role="presentation"
          />
        </div>
      )}
    </>
  );
}
