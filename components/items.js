import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { ToastContainer, toast } from 'react-toastify';
import { FaTrash, FaEdit, FaPlus, FaImage, FaUpload, FaTimes } from 'react-icons/fa';
import Loader from './loader';
import ImageWithPreview from './ImageWithPreview';
import { fetchAllItems, fetchAllSections, HTTP } from '../actions/actions_creators';

const ItemsManager = (props) => {
    const { user } = props;
    const [allItems, setAllItems] = useState([]);
    const [items, setItems] = useState([]);
    const [sections, setSections] = useState([]);
    const [selectedSection, setSelectedSection] = useState('');
    const [newItem, setNewItem] = useState({ name: '', value: '', rate: '' });
    const [itemImageFile, setItemImageFile] = useState(null);
    const [itemImagePreview, setItemImagePreview] = useState(null);
    const [editableItemId, setEditableItemId] = useState(null);
    const [showNewItemRow, setShowNewItemRow] = useState(false);
    const [loading, setLoading] = useState(false);
    const [imageActionItemId, setImageActionItemId] = useState(null);
    const [imageActionLoading, setImageActionLoading] = useState(false);
    // Image update: pending URL after upload, item to apply to, and modal for same-name choice
    const [pendingImageUrl, setPendingImageUrl] = useState(null);
    const [pendingImageItem, setPendingImageItem] = useState(null);
    const [showSameNameModal, setShowSameNameModal] = useState(false);
    const [sameNameModalMode, setSameNameModalMode] = useState(null); // 'replace' | 'delete'
    const [hiddenFileInputKey, setHiddenFileInputKey] = useState(0);

    useEffect(() => {
        fetchSections();
    }, []);

    useEffect(() => {
        fetchItems();
    }, [selectedSection]);

    const fetchSections = async () => {
        setLoading(true); // Start loading
        try {
            const response = await fetchAllSections()
            setSections(response);
        } catch (error) {
            toast.error('Failed to fetch sections');
        } 
    };

    const fetchItems = async (isCallApi) => {
        setLoading(true); // Start loading
        try {
            const response = await fetchAllItems(isCallApi);
            setAllItems(response || []);
            if (!selectedSection) {
                setItems(response || []);
            } else {
                setItems((response || []).filter((item) => item.section === selectedSection));
            }
        } catch (error) {
            toast.error('Failed to fetch items');
        } finally {
            setLoading(false); // End loading
        }
    };

    const handleSectionChange = (e) => setSelectedSection(e.target.value);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setNewItem({ ...newItem, [name]: value });
    };

    const uploadItemImage = async (file) => {
        const token = localStorage.getItem('token');
        const formData = new FormData();
        formData.append('image', file);
        const res = await axios.post('/api/upload-item-image', formData, {
            headers: { Authorization: `Bearer ${token}` },
        });
        return res.data?.url;
    };

    const handleAddItem = async (e) => {
        if (!selectedSection) {
            toast.warn('Section is required');
            return;
        }
        e.preventDefault();
        let imageUrl = null;
        if (itemImageFile) {
            try {
                imageUrl = await uploadItemImage(itemImageFile);
            } catch (err) {
                toast.error(err.response?.data?.message || 'Failed to upload image');
                return;
            }
        }
        const payload = {
            ...newItem,
            user: { _id: user?._id ?? '', name: user?.name ?? '' },
            section: selectedSection,
            ...(imageUrl && { imageUrl }),
        };
        setLoading(true); // Start loading
        try {
            const response = await HTTP('POST', '/items', payload);
            fetchItems(true);
            setItems([response.item, ...items]);
            setNewItem({ name: '', rate: '' });
            setItemImageFile(null);
            setItemImagePreview(null);
            
            // Show different message if item was added to multiple sections
            if (response.itemsCreated && response.itemsCreated > 1) {
                toast.success(`Item added to all ${response.itemsCreated} sections!`, { autoClose: 2000 });
            } else {
                toast.success(response.message, { autoClose: 500 });
            }
        } catch (error) {
            toast.error('Failed to add item');
        } finally {
            setLoading(false); // End loading
        }
    };

    const handleEditItem = async (item) => {
        if (!item) return;
        setLoading(true); // Start loading
        try {
            const response = await HTTP('PUT','/items', item);
            setItems(items.map((i) => (i._id === item._id ? response.item : i)));
            fetchItems(true);
            toast.success('Item updated successfully', { autoClose: 500 }); // Set autoClose to 1 second
        } catch (error) {
            toast.error('Failed to update item');
        } finally {
            setLoading(false); // End loading
        }
    };

    const handleDeleteItem = async (itemId) => {
        if (!itemId) return;
        setLoading(true); // Start loading
        try {
            await HTTP('DELETE','/items', { id: itemId });
            setItems(items.filter((item) => item._id !== itemId));
            fetchItems(true);
            toast.success('Item deleted successfully', { autoClose: 500 }); // Set autoClose to 1 second
        } catch (error) {
            toast.error('Failed to delete item');
        } finally {
            setLoading(false); // End loading
        }
    };

    const handleAddNewRow = () => {
        setShowNewItemRow(true);
        setItemImageFile(null);
        setItemImagePreview(null);
    };

    const handleImageChange = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) {
            toast.warn('Please select an image (JPEG, PNG, GIF, WebP)');
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            toast.warn('Image must be under 5MB');
            return;
        }
        setItemImageFile(file);
        const reader = new FileReader();
        reader.onload = () => setItemImagePreview(reader.result);
        reader.readAsDataURL(file);
    };

    const handleSaveNewItem = async (e) => {
        await handleAddItem(e);
        setShowNewItemRow(false);
    };

    const getSameNameCount = (item) => (allItems || []).filter((i) => i.name === item.name).length;

    const triggerImageFileInput = (item) => {
        setPendingImageItem(item);
        setSameNameModalMode(null);
        document.getElementById('item-image-file-input')?.click();
    };

    const handleImageFileChosen = async (e) => {
        const file = e.target.files?.[0];
        e.target.value = '';
        if (!file || !pendingImageItem) return;
        if (!file.type.startsWith('image/')) {
            toast.warn('Please select an image (JPEG, PNG, GIF, WebP)');
            setPendingImageItem(null);
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            toast.warn('Image must be under 5MB');
            setPendingImageItem(null);
            return;
        }
        setImageActionItemId(pendingImageItem._id);
        setImageActionLoading(true);
        setLoading(true);
        try {
            const url = await uploadItemImage(file);
            const sameCount = getSameNameCount(pendingImageItem);
            if (sameCount > 1) {
                setPendingImageUrl(url);
                setShowSameNameModal(true);
                setSameNameModalMode('replace');
            } else {
                await applyImageUpdate(pendingImageItem._id, url, false);
                setPendingImageItem(null);
                toast.success('Image updated');
            }
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to upload image');
            setPendingImageItem(null);
        } finally {
            setLoading(false);
            setImageActionLoading(false);
        }
    };

    const applyImageUpdate = async (itemId, imageUrl, applyToSameNameItems) => {
        const item = allItems.find((i) => i._id === itemId) || pendingImageItem;
        if (!item) return;
        setImageActionItemId(itemId);
        setImageActionLoading(true);
        setLoading(true);
        try {
            await HTTP('PUT', '/items', {
                _id: item._id,
                name: item.name,
                rate: item.rate,
                section: item.section,
                imageUrl,
                applyToSameNameItems,
            });
            fetchItems(true);
            toast.success(applyToSameNameItems ? 'Image updated for all same-name items!' : 'Image updated');
        } catch (error) {
            toast.error('Failed to update image');
        } finally {
            setLoading(false);
            setImageActionLoading(false);
            setImageActionItemId(null);
            setPendingImageUrl(null);
            setPendingImageItem(null);
            setShowSameNameModal(false);
        }
    };

    const handleConfirmSameNameModal = (applyToSameName) => {
        if (sameNameModalMode === 'replace' && pendingImageUrl && pendingImageItem) {
            applyImageUpdate(pendingImageItem._id, pendingImageUrl, applyToSameName);
        } else if (sameNameModalMode === 'delete' && pendingImageItem) {
            removeItemImage(pendingImageItem._id, applyToSameName);
        }
    };

    const removeItemImage = async (itemId, applyToSameNameItems = false) => {
        const item = allItems.find((i) => i._id === itemId) || pendingImageItem;
        if (!item) return;
        setImageActionItemId(itemId);
        setImageActionLoading(true);
        setLoading(true);
        try {
            await HTTP('PUT', '/items', {
                _id: item._id,
                name: item.name,
                rate: item.rate,
                section: item.section,
                imageUrl: null,
                applyToSameNameItems: !!applyToSameNameItems,
            });
            fetchItems(true);
            toast.success(applyToSameNameItems ? 'Image removed from all same-name items!' : 'Image removed');
        } catch (error) {
            toast.error('Failed to remove image');
        } finally {
            setLoading(false);
            setImageActionLoading(false);
            setImageActionItemId(null);
            setPendingImageItem(null);
            setShowSameNameModal(false);
        }
    };

    const handleDeleteImageClick = (item) => {
        const sameCount = getSameNameCount(item);
        if (sameCount > 1) {
            setPendingImageItem(item);
            setSameNameModalMode('delete');
            setShowSameNameModal(true);
        } else {
            if (window.confirm('Remove image from this item?')) {
                removeItemImage(item._id, false);
            }
        }
    };

    const sameNameCount = pendingImageItem ? getSameNameCount(pendingImageItem) : 0;

    return (
        <div className="relative p-8 bg-gray-50 rounded-lg shadow-lg max-w-4xl mx-auto">
             <ToastContainer />
            <input
                id="item-image-file-input"
                key={hiddenFileInputKey}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                className="hidden"
                onChange={handleImageFileChosen}
            />
            {loading && (
               <Loader />
            )}
            {/* Same-name modal: apply image to only this item or all same-name items */}
            {showSameNameModal && pendingImageItem && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
                        <h3 className="text-lg font-semibold text-gray-800 mb-2">
                            {sameNameModalMode === 'delete' ? 'Remove image' : 'Update image'}
                        </h3>
                        <p className="text-gray-600 mb-4">
                            {sameNameModalMode === 'delete'
                                ? `"${pendingImageItem.name}" appears in ${sameNameCount} section(s).`
                                : `"${pendingImageItem.name}" exists in ${sameNameCount} section(s).`}
                        </p>
                        <p className="text-sm text-gray-500 mb-4">
                            {sameNameModalMode === 'delete'
                                ? 'Remove image from this item only or from all same-name items?'
                                : 'Apply this image to this item only or to all same-name items?'}
                        </p>
                        <div className="flex flex-col gap-2">
                            <button
                                type="button"
                                onClick={() => handleConfirmSameNameModal(false)}
                                disabled={loading}
                                className="w-full py-2.5 px-4 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 font-medium disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                                Only this item
                            </button>
                            <button
                                type="button"
                                onClick={() => handleConfirmSameNameModal(true)}
                                disabled={loading}
                                className="w-full py-2.5 px-4 rounded-lg bg-blue-600 text-white hover:bg-blue-700 font-medium disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                                Same name in all sections ({sameNameCount} items)
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setShowSameNameModal(false);
                                    setPendingImageUrl(null);
                                    setPendingImageItem(null);
                                }}
                                disabled={loading}
                                className="w-full py-2 text-gray-500 hover:text-gray-700 text-sm"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
            <h1 className="text-3xl font-bold text-gray-800 mb-6">Items Manager</h1>

            <div className="mb-6 flex items-center gap-2">
                <select
                    value={selectedSection}
                    onChange={handleSectionChange}
                    className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-400"
                    onTouchCancel={true}
                >
                    <option value="">{selectedSection? "Clear Selection" :"Select Section"}</option>
                    {sections.map((section) => (
                        <option key={section._id} value={section._id}>
                            {section.name}
                        </option>
                    ))}
                     
                </select>
                
                {selectedSection && (
                    <button
                        onClick={handleAddNewRow}
                        className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition"
                    >
                        <FaPlus /> Add Item
                    </button>
                )}
            </div>

            {showNewItemRow && (
                <table className="w-full mt-2 bg-white rounded-lg shadow-md">
                    <thead>
                        <tr className="bg-gray-100 sticky">
                            <th className="py-3 px-4 text-left">Name</th>
                            <th className="py-3 px-4 text-left">Rate</th>
                            <th className="py-3 px-4 text-left">Image</th>
                            <th className="py-3 px-4 text-left">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td className="py-2 px-4">
                                <input
                                    type="text"
                                    name="name"
                                    value={newItem.name}
                                    onChange={handleInputChange}
                                    placeholder="Item Name"
                                    className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-blue-400"
                                />
                            </td>
                            <td className="py-2 px-4">
                                <input
                                    type="number"
                                    name="rate"
                                    value={newItem.rate}
                                    onChange={handleInputChange}
                                    placeholder="Item Rate"
                                    className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-blue-400"
                                />
                            </td>
                            <td className="py-2 px-4">
                                <div className="flex items-center gap-2">
                                    <label className="cursor-pointer text-sm text-blue-600 hover:underline">
                                        <input
                                            type="file"
                                            accept="image/jpeg,image/png,image/gif,image/webp"
                                            onChange={handleImageChange}
                                            className="hidden"
                                        />
                                        {itemImageFile ? itemImageFile.name : 'Choose image'}
                                    </label>
                                    {itemImagePreview && (
                                        <img src={itemImagePreview} alt="Preview" className="h-10 w-10 object-cover rounded border" />
                                    )}
                                </div>
                            </td>
                            <td className="py-2 px-4">
                                <button
                                    onClick={handleSaveNewItem}
                                    className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition"
                                >
                                    Save
                                </button>
                            </td>
                        </tr>
                    </tbody>
                </table>
            )}

<div className="overflow-auto max-h-80"> {/* Scrollable container */}
    <table className="w-full mt-6 bg-white rounded-lg shadow-md">
        <thead className="bg-gray-100">
            <tr className="sticky top-0 bg-gray-100 z-10"> {/* Make header sticky */}
                <th className="py-3 px-4 text-left">Section</th>
                <th className="py-3 px-4 text-left">Name</th>
                <th className="py-3 px-4 text-left">Rate</th>
                <th className="py-3 px-4 text-left">Image</th>
                <th className="py-3 px-4 text-left">Actions</th>
            </tr>
        </thead>
        <tbody>
            {items.map((item) => (
                <tr key={item._id} className="border-b hover:bg-gray-50">
                    <td className="py-2 px-4">
                        {sections?.find((s) => s._id === item.section)?.name}
                    </td>
                    <td className="py-2 px-4">
                        {editableItemId === item._id ? (
                            <input
                                type="text"
                                defaultValue={item.name}
                                onBlur={(e) => {
                                    handleEditItem({ ...item, name: e.target.value });
                                    setEditableItemId(null);
                                }}
                                className="w-full border p-2 rounded-lg"
                            />
                        ) : (
                            item.name
                        )}
                    </td>
                    <td className="py-2 px-4">
                        {editableItemId === item._id ? (
                            <input
                                type="number"
                                defaultValue={item.rate}
                                onBlur={(e) => {
                                    handleEditItem({ ...item, rate: e.target.value });
                                    setEditableItemId(null);
                                }}
                                className="w-full border p-2 rounded-lg"
                            />
                        ) : (
                            item.rate
                        )}
                    </td>
                    <td className="py-2 px-4">
                        {(() => {
                            const rowBusy = imageActionLoading && imageActionItemId === item._id;
                            const imgSrc = `/api/item-image?url=${encodeURIComponent(item.imageUrl || '')}`;
                            return item.imageUrl ? (
                                <div className="flex items-center gap-2">
                                    <div className="relative">
                                        <ImageWithPreview
                                            src={imgSrc}
                                            alt={item.name}
                                            thumbnailClass="h-10 w-10"
                                            className={rowBusy ? 'opacity-60 pointer-events-none' : ''}
                                        />
                                        {rowBusy && (
                                            <div className="absolute inset-0 flex items-center justify-center">
                                                <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-500 border-t-transparent" />
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex flex-col gap-0.5">
                                        <button
                                            type="button"
                                            onClick={() => triggerImageFileInput(item)}
                                            disabled={rowBusy || loading}
                                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition disabled:opacity-50 disabled:cursor-not-allowed"
                                            title="Replace image"
                                        >
                                            <FaImage className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleDeleteImageClick(item)}
                                            disabled={rowBusy || loading}
                                            className="p-1.5 text-red-600 hover:bg-red-50 rounded transition disabled:opacity-50 disabled:cursor-not-allowed"
                                            title="Delete image"
                                        >
                                            <FaTimes className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => triggerImageFileInput(item)}
                                    disabled={rowBusy || loading}
                                    className="flex items-center gap-1.5 px-2 py-1.5 text-sm text-blue-600 border border-blue-300 rounded-lg hover:bg-blue-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {rowBusy ? (
                                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent" />
                                    ) : (
                                        <FaUpload className="w-4 h-4" />
                                    )}
                                    {rowBusy ? 'Uploading...' : 'Upload'}
                                </button>
                            );
                        })()}
                    </td>
                    <td className="py-2 px-4 flex space-x-2">
                        <button
                            onClick={() => setEditableItemId(item._id)}
                            className="bg-blue-500 text-white p-2 rounded-lg hover:bg-blue-600 transition"
                        >
                            <FaEdit />
                        </button>
                        <button
                            onClick={() => handleDeleteItem(item._id)}
                            className="bg-red-500 text-white p-2 rounded-lg hover:bg-red-600 transition"
                        >
                            <FaTrash />
                        </button>
                    </td>
                </tr>
            ))}
        </tbody>
    </table>
</div>
</div>

    );
};

export default ItemsManager;
